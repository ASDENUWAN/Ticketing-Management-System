<?php

namespace Database\Seeders;


use App\Models\Category;
use App\Models\CategoryType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class TicketCategorySeeder extends Seeder
{
    public function run(): void
    {
        /*
        |--------------------------------------------------------------------------
        | 1. Register category management permissions
        |--------------------------------------------------------------------------
        */

        $permissions = [
            'categories.view',
            'categories.create',
            'categories.update',
            'categories.delete',

            'category_types.create',
            'category_types.update',
            'category_types.delete',
        ];

        foreach ($permissions as $name) {
            Permission::findOrCreate($name, 'web');
        }

        /*
        |--------------------------------------------------------------------------
        | 2. Define category types and their categories
        |--------------------------------------------------------------------------
        */

        $types = [
            [
                'code' => 'ticket_type',
                'name' => 'Ticket Type',
                'description' => 'Types of support tickets.',

                'categories' => [
                    ['personal', 'Personal'],
                    ['change_request', 'Change Request'],
                ],
            ],

            [
                'code' => 'ticket_priority',
                'name' => 'Ticket Priority',
                'description' => 'Urgency of a support ticket.',

                'categories' => [
                    ['low', 'Low'],
                    ['medium', 'Medium'],
                    ['high', 'High'],
                    ['critical', 'Critical'],
                ],
            ],

            [
                'code' => 'ticket_status',
                'name' => 'Ticket Status',
                'description' => 'Ticket workflow stages.',

                'categories' => [
                    ['open', 'Open'],

                ],
            ],
        ];

        /*
        |--------------------------------------------------------------------------
        | 3. Reset ONLY categories under these category types
        |--------------------------------------------------------------------------
        |
        | Existing category_types records are preserved.
        |
        | Other category types and their categories
        | are NOT affected.
        |
        | A transaction ensures that if a deletion or
        | insertion fails, the changes are rolled back.
        |
        */

        DB::transaction(function () use ($types) {

            foreach ($types as $definition) {

                // Find existing type or create it.
                // Do not delete the category type.
                $type = CategoryType::firstOrCreate(
                    [
                        'code' => $definition['code'],
                    ],
                    [
                        'name' => $definition['name'],
                        'description' =>
                        $definition['description'],
                        'is_active' => true,
                    ]
                );

                // Keep the system type protected.
                $type->forceFill([
                    'is_system' => true,
                    'is_active' => true,
                ])->save();

                /*
                |--------------------------------------
                | Delete existing categories ONLY
                | within the current category type.
                |--------------------------------------
                */

                Category::query()
                    ->where(
                        'category_type_id',
                        $type->id
                    )
                    ->delete();

                /*
                |--------------------------------------
                | Insert the new category values.
                |--------------------------------------
                */

                foreach (
                    $definition['categories'] as
                    $index => [$code, $name]
                ) {

                    $category = new Category([
                        'category_type_id' => $type->id,
                        'code' => $code,
                        'name' => $name,
                        'sort_order' => ($index + 1) * 10,
                        'is_active' => true,
                    ]);

                    $category->forceFill([
                        'is_system' => true,
                    ]);

                    $category->save();
                }
            }
        });

        /*
        |--------------------------------------------------------------------------
        | 4. Clear Spatie permission cache
        |--------------------------------------------------------------------------
        */

        app(PermissionRegistrar::class)
            ->forgetCachedPermissions();

        $this->command?->info(
            'Ticket categories reset and seeded successfully.'
        );
    }
}
