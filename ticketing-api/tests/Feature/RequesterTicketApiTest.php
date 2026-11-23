<?php

namespace Tests\Feature;


use App\Models\Category;
use App\Models\System;
use App\Models\SystemCategory;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use Database\Seeders\SystemManagementSeeder;
use Database\Seeders\TicketCategorySeeder;
use Database\Seeders\TicketRequesterPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RequesterTicketApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(TicketCategorySeeder::class);
        $this->seed(SystemManagementSeeder::class);
        $this->seed(TicketRequesterPermissionSeeder::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Test Helpers
    |--------------------------------------------------------------------------
    */

    private function user(string $username): User
    {
        return User::create([
            'username' => $username,
            'password' => 'TestPassword123!Secure',
        ]);
    }

    private function system(
        string $code = 'sims'
    ): System {
        return System::create([
            'code' => $code,
            'name' => strtoupper($code),
            'is_active' => true,
        ]);
    }

    private function type(string $code): Category
    {
        return Category::query()
            ->where('code', $code)
            ->whereHas(
                'categoryType',
                fn($query) => $query->where(
                    'code',
                    'ticket_type'
                )
            )
            ->firstOrFail();
    }

    private function payload(
        System $system,
        string $type = 'personal'
    ): array {
        return [
            'ticket_type_id' => $this->type($type)->id,
            'system_id' => $system->id,
            'system_category_id' => null,
            'description' =>
            'I need assistance with this system.',
        ];
    }

    /**
     * IMPORTANT:
     *
     * Sanctum may cache the authenticated user
     * during multiple requests in one test.
     *
     * Clear all resolved guards before
     * authenticating as a different user.
     */
    private function switchUser(User $user): void
    {
        Auth::forgetGuards();

        $this->actingAs($user, 'web');
    }

    /*
    |--------------------------------------------------------------------------
    | 1. Guest Cannot Create Ticket
    |--------------------------------------------------------------------------
    */

    public function test_guest_cannot_create_ticket(): void
    {
        $system = $this->system();

        $this->postJson(
            '/api/tickets',
            $this->payload($system)
        )->assertUnauthorized();
    }

    /*
    |--------------------------------------------------------------------------
    | 2. Assigned User Can Create Personal Ticket
    |--------------------------------------------------------------------------
    */

    public function test_assigned_user_can_create_personal_ticket(): void
    {
        $user = $this->user('student01');
        $system = $this->system();

        $user->systems()->attach($system->id);

        $response = $this
            ->actingAs($user, 'web')
            ->postJson(
                '/api/tickets',
                $this->payload($system)
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.ticket_type.code',
                'personal'
            )
            ->assertJsonPath(
                'data.priority.code',
                'medium'
            )
            ->assertJsonPath(
                'data.status.code',
                'open'
            );

        $ticket = Ticket::firstOrFail();

        $expectedNumber = 'CITS-' . str_pad(
            (string) $ticket->id,
            6,
            '0',
            STR_PAD_LEFT
        );

        $this->assertSame(
            $expectedNumber,
            $response->json('data.ticket_number')
        );

        $this->assertSame(
            $user->id,
            $ticket->requester_id
        );
    }

    /*
    |--------------------------------------------------------------------------
    | 3. Unassigned User Cannot Create Ticket
    |--------------------------------------------------------------------------
    */

    public function test_unassigned_user_cannot_create_ticket(): void
    {
        $user = $this->user('student02');
        $system = $this->system();

        $this->actingAs($user, 'web')
            ->postJson(
                '/api/tickets',
                $this->payload($system)
            )
            ->assertForbidden();

        $this->assertDatabaseCount('tickets', 0);
    }

    /*
    |--------------------------------------------------------------------------
    | 4. Inactive System Cannot Receive Ticket
    |--------------------------------------------------------------------------
    */

    public function test_inactive_system_cannot_receive_ticket(): void
    {
        $user = $this->user('student03');
        $system = $this->system();

        $user->systems()->attach($system->id);

        $system->update([
            'is_active' => false,
        ]);

        $this->actingAs($user, 'web')
            ->postJson(
                '/api/tickets',
                $this->payload($system)
            )
            ->assertUnprocessable();

        $this->assertDatabaseCount('tickets', 0);
    }

    /*
    |--------------------------------------------------------------------------
    | 5. Other / I'm Not Sure Is Allowed
    |--------------------------------------------------------------------------
    */

    public function test_other_module_option_is_allowed(): void
    {
        $user = $this->user('student04');
        $system = $this->system();

        $user->systems()->attach($system->id);

        $response = $this
            ->actingAs($user, 'web')
            ->postJson(
                '/api/tickets',
                $this->payload($system)
            )
            ->assertCreated();

        $response->assertJsonPath(
            'data.module_label',
            "Other / I'm not sure"
        );

        $this->assertNull(
            Ticket::firstOrFail()->system_category_id
        );
    }

    /*
    |--------------------------------------------------------------------------
    | 6. Module Must Belong To Selected System
    |--------------------------------------------------------------------------
    */

    public function test_module_from_another_system_is_rejected(): void
    {
        $user = $this->user('student05');

        $sims = $this->system('sims');
        $lms = $this->system('lms');

        $user->systems()->attach($sims->id);

        $module = SystemCategory::create([
            'system_id' => $lms->id,
            'code' => 'registration',
            'name' => 'Registration',
            'is_active' => true,
        ]);

        $payload = $this->payload($sims);

        $payload['system_category_id'] = $module->id;

        $this->actingAs($user, 'web')
            ->postJson('/api/tickets', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'system_category_id',
            ]);

        $this->assertDatabaseCount('tickets', 0);
    }

    /*
    |--------------------------------------------------------------------------
    | 7. Normal User Cannot Create Change Request
    |--------------------------------------------------------------------------
    */

    public function test_normal_user_cannot_create_change_request(): void
    {
        $user = $this->user('student06');
        $system = $this->system();

        $user->systems()->attach(
            $system->id,
            ['is_head' => false]
        );

        $this->actingAs($user, 'web')
            ->postJson(
                '/api/tickets',
                $this->payload(
                    $system,
                    'change_request'
                )
            )
            ->assertForbidden();

        $this->assertDatabaseCount('tickets', 0);
    }

    /*
    |--------------------------------------------------------------------------
    | 8. System Head Can Create Change Request
    |--------------------------------------------------------------------------
    */

    public function test_system_head_can_create_change_request(): void
    {
        $user = $this->user('head01');
        $system = $this->system();

        $user->assignRole('System Head');

        $user->systems()->attach(
            $system->id,
            ['is_head' => true]
        );

        $this->actingAs($user, 'web')
            ->postJson(
                '/api/tickets',
                $this->payload(
                    $system,
                    'change_request'
                )
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.ticket_type.code',
                'change_request'
            );

        $this->assertDatabaseCount('tickets', 1);
    }

    /*
    |--------------------------------------------------------------------------
    | 9. System Head Role Alone Is Insufficient
    |--------------------------------------------------------------------------
    */

    public function test_head_role_without_system_head_assignment_is_insufficient(): void
    {
        $user = $this->user('head02');
        $system = $this->system();

        $user->assignRole('System Head');

        $user->systems()->attach(
            $system->id,
            ['is_head' => false]
        );

        $this->actingAs($user, 'web')
            ->postJson(
                '/api/tickets',
                $this->payload(
                    $system,
                    'change_request'
                )
            )
            ->assertForbidden();

        $this->assertDatabaseCount('tickets', 0);
    }

    /*
    |--------------------------------------------------------------------------
    | 10. Create Options Filter Systems Correctly
    |--------------------------------------------------------------------------
    */

    public function test_create_options_filter_change_request_systems(): void
    {
        $user = $this->user('head03');

        $user->assignRole('System Head');

        $sims = $this->system('sims');
        $lms = $this->system('lms');

        $user->systems()->attach(
            $sims->id,
            ['is_head' => true]
        );

        $user->systems()->attach(
            $lms->id,
            ['is_head' => false]
        );

        $response = $this
            ->actingAs($user, 'web')
            ->getJson('/api/tickets/create-options')
            ->assertOk();

        $types = collect(
            $response->json('data.ticket_types')
        );

        $personal = $types->firstWhere(
            'code',
            'personal'
        );

        $change = $types->firstWhere(
            'code',
            'change_request'
        );

        $this->assertNotNull($personal);
        $this->assertNotNull($change);

        $this->assertCount(
            2,
            $personal['systems']
        );

        $this->assertCount(
            1,
            $change['systems']
        );

        $this->assertSame(
            'sims',
            $change['systems'][0]['code']
        );
    }

    /*
    |--------------------------------------------------------------------------
    | 11. Requester Cannot Override Priority Or Status
    |--------------------------------------------------------------------------
    */

    public function test_requester_cannot_override_status_or_priority(): void
    {
        $user = $this->user('student07');
        $system = $this->system();

        $user->systems()->attach($system->id);

        $payload = $this->payload($system);

        $payload['status_id'] = 999;
        $payload['priority_id'] = 999;

        $this->actingAs($user, 'web')
            ->postJson('/api/tickets', $payload)
            ->assertUnprocessable();

        $this->assertDatabaseCount('tickets', 0);
    }

    /*
    |--------------------------------------------------------------------------
    | 12. Ticket Privacy / Requester Ownership
    |--------------------------------------------------------------------------
    |
    | FIXED:
    | Auth::forgetGuards() is called using
    | switchUser() before changing users.
    |
    */

    public function test_only_requester_can_view_their_ticket(): void
    {
        $owner = $this->user('student08');
        $other = $this->user('student09');

        $system = $this->system();

        $owner->systems()->attach($system->id);

        /*
         * Owner creates the ticket.
         */
        $this->switchUser($owner);

        $response = $this->postJson(
            '/api/tickets',
            $this->payload($system)
        )->assertCreated();

        $ticketId = $response->json('data.id');

        /*
         * Verify database ownership.
         */
        $this->assertDatabaseHas('tickets', [
            'id' => $ticketId,
            'requester_id' => $owner->id,
        ]);

        /*
         * Owner can view the ticket.
         */
        $this->getJson(
            "/api/tickets/{$ticketId}"
        )
            ->assertOk()
            ->assertJsonPath(
                'data.id',
                $ticketId
            );

        /*
         * Switch to unrelated user.
         *
         * This clears Sanctum's cached user.
         */
        $this->switchUser($other);

        /*
         * First verify that the API recognizes
         * the second user, not the owner.
         */
        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath(
                'user.id',
                $other->id
            );

        /*
         * Other user cannot view owner's ticket.
         */
        $this->getJson(
            "/api/tickets/{$ticketId}"
        )->assertNotFound();

        /*
         * Other user cannot see the ticket
         * in their own ticket list.
         */
        $this->getJson('/api/my-tickets')
            ->assertOk()
            ->assertJsonPath(
                'meta.total',
                0
            );
    }

    /*
    |--------------------------------------------------------------------------
    | 13. Attachment Privacy / Secure Download
    |--------------------------------------------------------------------------
    |
    | FIXED:
    | Reset authentication state whenever
    | switching between owner and another user.
    |
    */

    public function test_attachment_is_private_and_owner_can_download(): void
    {
        Storage::fake('local');

        $owner = $this->user('student10');
        $other = $this->user('student11');

        $system = $this->system();

        $owner->systems()->attach($system->id);

        $payload = $this->payload($system);

        $payload['attachments'] = [
            UploadedFile::fake()->create(
                'evidence.pdf',
                100,
                'application/pdf'
            ),
        ];

        /*
         * Step 1:
         * Owner creates a ticket with attachment.
         */
        $this->switchUser($owner);

        $this->withHeaders([
            'Accept' => 'application/json',
        ])
            ->post('/api/tickets', $payload)
            ->assertCreated()
            ->assertJsonPath(
                'data.attachments_count',
                1
            );

        /*
         * Step 2:
         * Verify file metadata and storage.
         */
        $attachment = TicketAttachment::firstOrFail();

        $attachment->load('ticket');

        $this->assertSame(
            $owner->id,
            $attachment->ticket->requester_id
        );

        $this->assertTrue(
            Storage::disk('local')->exists(
                $attachment->file_path
            ),
            'The ticket attachment must exist in private storage.'
        );

        /*
         * Step 3:
         * Switch to unrelated user.
         */
        $this->switchUser($other);

        /*
         * Verify the API authenticates as
         * the correct user.
         */
        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath(
                'user.id',
                $other->id
            );

        /*
         * Step 4:
         * Other user cannot download the file.
         */
        $this->get(
            "/api/ticket-attachments/{$attachment->id}"
        )->assertNotFound();

        /*
         * Step 5:
         * Switch back to the ticket owner.
         */
        $this->switchUser($owner);

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath(
                'user.id',
                $owner->id
            );

        /*
         * Step 6:
         * Ticket owner can download the file.
         */
        $this->get(
            "/api/ticket-attachments/{$attachment->id}"
        )
            ->assertOk()
            ->assertDownload('evidence.pdf');
    }

    /*
    |--------------------------------------------------------------------------
    | 14. Strict File Size — Exactly 2 MiB Rejected
    |--------------------------------------------------------------------------
    */

    public function test_attachment_of_exactly_two_mib_is_rejected(): void
    {
        Storage::fake('local');

        $user = $this->user('student12');
        $system = $this->system();

        $user->systems()->attach($system->id);

        $payload = $this->payload($system);

        $payload['attachments'] = [
            UploadedFile::fake()->create(
                'large.pdf',
                2048,
                'application/pdf'
            ),
        ];

        $this->actingAs($user, 'web')
            ->withHeaders([
                'Accept' => 'application/json',
            ])
            ->post('/api/tickets', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'attachments.0',
            ]);

        $this->assertDatabaseCount('tickets', 0);

        $this->assertDatabaseCount(
            'ticket_attachments',
            0
        );
    }
}
