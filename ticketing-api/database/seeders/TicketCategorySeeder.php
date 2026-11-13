<?php

namespace Database\Seeders;


use App\Models\Category;
use App\Models\CategoryType;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class TicketCategorySeeder extends Seeder
{
    public function run(): void
    {
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

        $types = [
            [
                'code' => 'ticket_type',
                'name' => 'Ticket Type',
                'description' => 'Types of support tickets.',
                'categories' => [
                    ['issue', 'Issue'],
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
                    ['assigned', 'Assigned'],
                    ['in_progress', 'In Progress'],
                    ['waiting_for_user', 'Waiting for User'],
                    ['resolved', 'Resolved'],
                    ['closed', 'Closed'],
                ],
            ],
        ];

        foreach ($types as $definition) {
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

            $type->forceFill([
                'is_system' => true,
                'is_active' => true,
            ])->save();

            foreach (
                $definition['categories'] as
                $index => [$code, $name]
            ) {
                $category = Category::firstOrCreate(
                    [
                        'category_type_id' => $type->id,
                        'code' => $code,
                    ],
                    [
                        'name' => $name,
                        'sort_order' => ($index + 1) * 10,
                        'is_active' => true,
                    ]
                );

                $category->forceFill([
                    'is_system' => true,
                    'is_active' => true,
                ])->save();
            }
        }

        app(PermissionRegistrar::class)
            ->forgetCachedPermissions();
    }
}
