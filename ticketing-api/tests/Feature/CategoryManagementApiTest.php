<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CategoryType;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Database\Seeders\TicketCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryManagementApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AccessControlSeeder::class);
        $this->seed(TicketCategorySeeder::class);
    }

    private function superAdmin(): User
    {
        $user = User::create([
            'username' => 'category_root',
            'password' => 'TestPassword123!Secure',
        ]);

        $user->assignRole('Super Admin');

        return $user;
    }

    public function test_initial_category_types_and_categories_exist(): void
    {
        $this->assertDatabaseHas('category_types', [
            'code' => 'ticket_type',
            'is_system' => true,
        ]);

        $this->assertDatabaseHas('category_types', [
            'code' => 'ticket_priority',
            'is_system' => true,
        ]);

        $this->assertDatabaseHas('category_types', [
            'code' => 'ticket_status',
            'is_system' => true,
        ]);

        $this->assertDatabaseHas('categories', [
            'code' => 'change_request',
            'is_system' => true,
        ]);
    }

    public function test_guest_cannot_access_category_management(): void
    {
        $this->getJson('/api/category-types')
            ->assertUnauthorized();

        $this->getJson('/api/categories')
            ->assertUnauthorized();
    }

    public function test_super_admin_can_list_category_types_and_categories(): void
    {
        $admin = $this->superAdmin();

        $type = CategoryType::where(
            'code',
            'ticket_type'
        )->firstOrFail();

        $this->actingAs($admin, 'web')
            ->getJson('/api/category-types')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->getJson(
            "/api/categories?category_type_id={$type->id}"
        )
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonCount(2, 'data');
    }

    public function test_super_admin_can_create_and_edit_categories(): void
    {
        $admin = $this->superAdmin();

        $typeResponse = $this
            ->actingAs($admin, 'web')
            ->postJson('/api/category-types', [
                'code' => 'ticket_source',
                'name' => 'Ticket Source',
                'description' => 'Where tickets originate.',
                'is_active' => true,
            ])
            ->assertCreated();

        $typeId = $typeResponse->json('data.id');

        $categoryResponse = $this
            ->postJson('/api/categories', [
                'category_type_id' => $typeId,
                'code' => 'email',
                'name' => 'Email',
                'sort_order' => 10,
                'is_active' => true,
            ])
            ->assertCreated();

        $categoryId = $categoryResponse
            ->json('data.id');

        $this->patchJson(
            "/api/categories/{$categoryId}",
            [
                'name' => 'Email Request',
                'sort_order' => 20,
            ]
        )
            ->assertOk()
            ->assertJsonPath(
                'data.name',
                'Email Request'
            );

        $this->assertDatabaseHas('categories', [
            'id' => $categoryId,
            'category_type_id' => $typeId,
            'code' => 'email',
            'name' => 'Email Request',
        ]);
    }

    public function test_duplicate_category_codes_are_rejected(): void
    {
        $admin = $this->superAdmin();

        $type = CategoryType::where(
            'code',
            'ticket_type'
        )->firstOrFail();

        $this->actingAs($admin, 'web')
            ->postJson('/api/categories', [
                'category_type_id' => $type->id,
                'code' => 'issue',
                'name' => 'Duplicate Issue',
            ])
            ->assertUnprocessable();
    }

    public function test_core_category_cannot_be_deleted_or_deactivated(): void
    {
        $admin = $this->superAdmin();

        $category = Category::where(
            'code',
            'change_request'
        )->firstOrFail();

        $this->actingAs($admin, 'web')
            ->deleteJson(
                "/api/categories/{$category->id}"
            )
            ->assertStatus(409);

        $this->patchJson(
            "/api/categories/{$category->id}",
            ['is_active' => false]
        )
            ->assertStatus(409);

        $this->assertTrue(
            $category->fresh()->is_active
        );
    }

    public function test_type_with_categories_cannot_be_deleted(): void
    {
        $admin = $this->superAdmin();

        $type = CategoryType::create([
            'code' => 'test_group',
            'name' => 'Test Group',
        ]);

        Category::create([
            'category_type_id' => $type->id,
            'code' => 'test_value',
            'name' => 'Test Value',
        ]);

        $this->actingAs($admin, 'web')
            ->deleteJson(
                "/api/category-types/{$type->id}"
            )
            ->assertStatus(409);

        $this->assertDatabaseHas('category_types', [
            'id' => $type->id,
        ]);
    }

    public function test_unused_custom_categories_can_be_deleted(): void
    {
        $admin = $this->superAdmin();

        $type = CategoryType::create([
            'code' => 'custom_group',
            'name' => 'Custom Group',
        ]);

        $category = Category::create([
            'category_type_id' => $type->id,
            'code' => 'custom_value',
            'name' => 'Custom Value',
        ]);

        $this->actingAs($admin, 'web')
            ->deleteJson(
                "/api/categories/{$category->id}"
            )
            ->assertOk();

        $this->deleteJson(
            "/api/category-types/{$type->id}"
        )
            ->assertOk();

        $this->assertDatabaseMissing('categories', [
            'id' => $category->id,
        ]);

        $this->assertDatabaseMissing('category_types', [
            'id' => $type->id,
        ]);
    }

    public function test_category_code_is_immutable(): void
    {
        $admin = $this->superAdmin();

        $category = Category::where(
            'code',
            'issue'
        )->firstOrFail();

        $this->actingAs($admin, 'web')
            ->patchJson(
                "/api/categories/{$category->id}",
                ['code' => 'renamed_issue']
            )
            ->assertUnprocessable();

        $this->assertSame(
            'issue',
            $category->fresh()->code
        );
    }

    public function test_view_only_user_cannot_create_categories(): void
    {
        $user = User::create([
            'username' => 'category_viewer',
            'password' => 'TestPassword123!Secure',
        ]);

        $user->givePermissionTo('categories.view');

        $type = CategoryType::where(
            'code',
            'ticket_priority'
        )->firstOrFail();

        $this->actingAs($user, 'web')
            ->getJson('/api/category-types')
            ->assertOk();

        $this->postJson('/api/categories', [
            'category_type_id' => $type->id,
            'code' => 'restricted_test',
            'name' => 'Restricted Test',
        ])
            ->assertForbidden();
    }
}
