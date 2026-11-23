
<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ProfileAccessController;


use App\Http\Controllers\Api\CategoryTypeController;
use App\Http\Controllers\Api\CategoryController;


use App\Http\Controllers\Api\SystemController;
use App\Http\Controllers\Api\SystemCategoryController;
use App\Http\Controllers\Api\SystemMemberController;


use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\TicketAttachmentController;

Route::middleware('auth:sanctum')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Personal Profile
    |--------------------------------------------------------------------------
    */

    // View profile through existing GET /api/me
    // configured in routes/web.php.

    Route::patch('/profile', [
        ProfileController::class,
        'update',
    ])->middleware('can:profile.update');


    /*
    |--------------------------------------------------------------------------
    | User Management
    |--------------------------------------------------------------------------
    */

    Route::get('/users', [
        UserController::class,
        'index',
    ])->middleware('can:users.view');

    Route::post('/users', [
        UserController::class,
        'store',
    ])->middleware('can:users.create');

    Route::get('/users/{user}', [
        UserController::class,
        'show',
    ])->middleware('can:users.view');

    Route::patch('/users/{user}', [
        UserController::class,
        'update',
    ])->middleware('can:users.update');

    Route::delete('/users/{user}', [
        UserController::class,
        'destroy',
    ])->middleware('can:users.delete');


    /*
    |--------------------------------------------------------------------------
    | User Role & Permission Assignment
    |--------------------------------------------------------------------------
    */

    Route::put('/users/{user}/roles', [
        UserController::class,
        'syncRoles',
    ])->middleware([
        'can:users.update',
        'can:roles.assign',
    ]);

    Route::put('/users/{user}/permissions', [
        UserController::class,
        'syncPermissions',
    ])->middleware([
        'can:users.update',
        'can:permissions.assign',
    ]);


    /*
    |--------------------------------------------------------------------------
    | Super Admin Profile Editing Control
    |--------------------------------------------------------------------------
    */

    Route::patch('/users/{user}/profile-edit', [
        ProfileAccessController::class,
        'update',
    ])->middleware('can:users.update');


    /*
    |--------------------------------------------------------------------------
    | Role Management
    |--------------------------------------------------------------------------
    */

    Route::get('/roles', [
        RoleController::class,
        'index',
    ])->middleware('can:roles.view');

    Route::post('/roles', [
        RoleController::class,
        'store',
    ])->middleware('can:roles.create');

    Route::get('/roles/{role}', [
        RoleController::class,
        'show',
    ])->middleware('can:roles.view');

    Route::match(
        ['put', 'patch'],
        '/roles/{role}',
        [
            RoleController::class,
            'update',
        ]
    )->middleware('can:roles.update');

    Route::put('/roles/{role}/permissions', [
        RoleController::class,
        'syncPermissions',
    ])->middleware([
        'can:roles.update',
        'can:permissions.assign',
    ]);

    Route::delete('/roles/{role}', [
        RoleController::class,
        'destroy',
    ])->middleware('can:roles.delete');


    /*
    |--------------------------------------------------------------------------
    | Permission Management
    |--------------------------------------------------------------------------
    */

    Route::get('/permissions', [
        PermissionController::class,
        'index',
    ])->middleware('can:permissions.view');

    Route::post('/permissions', [
        PermissionController::class,
        'store',
    ])->middleware('can:permissions.create');

    Route::delete('/permissions/{permission}', [
        PermissionController::class,
        'destroy',
    ])->middleware('can:permissions.delete');



    /*
|--------------------------------------------------------------------------
| Category Type Management
|--------------------------------------------------------------------------
*/

    // Viewing both tables uses categories.view.
    Route::get('/category-types', [
        CategoryTypeController::class,
        'index',
    ])->middleware('can:categories.view');

    Route::post('/category-types', [
        CategoryTypeController::class,
        'store',
    ])->middleware('can:category_types.create');

    Route::patch('/category-types/{categoryType}', [
        CategoryTypeController::class,
        'update',
    ])->middleware('can:category_types.update');

    Route::delete('/category-types/{categoryType}', [
        CategoryTypeController::class,
        'destroy',
    ])->middleware('can:category_types.delete');


    /*
|--------------------------------------------------------------------------
| Category Management
|--------------------------------------------------------------------------
*/

    Route::get('/categories', [
        CategoryController::class,
        'index',
    ])->middleware('can:categories.view');

    Route::post('/categories', [
        CategoryController::class,
        'store',
    ])->middleware('can:categories.create');

    Route::patch('/categories/{category}', [
        CategoryController::class,
        'update',
    ])->middleware('can:categories.update');

    Route::delete('/categories/{category}', [
        CategoryController::class,
        'destroy',
    ])->middleware('can:categories.delete');


    /*
|--------------------------------------------------------------------------
| My Systems — All authenticated users
|--------------------------------------------------------------------------
*/

    Route::get('/my-systems', [
        SystemController::class,
        'mySystems',
    ]);

    /*
|--------------------------------------------------------------------------
| System Management
|--------------------------------------------------------------------------
*/

    Route::get('/systems', [
        SystemController::class,
        'index',
    ])->middleware('can:systems.view');

    Route::post('/systems', [
        SystemController::class,
        'store',
    ])->middleware('can:systems.create');

    Route::get('/systems/{system}', [
        SystemController::class,
        'show',
    ])->middleware('can:systems.view');

    Route::patch('/systems/{system}', [
        SystemController::class,
        'update',
    ])->middleware('can:systems.update');

    Route::delete('/systems/{system}', [
        SystemController::class,
        'destroy',
    ])->middleware('can:systems.delete');

    /*
|--------------------------------------------------------------------------
| System Categories
|--------------------------------------------------------------------------
*/

    Route::get('/systems/{system}/categories', [
        SystemCategoryController::class,
        'index',
    ]);

    Route::post('/systems/{system}/categories', [
        SystemCategoryController::class,
        'store',
    ])->middleware('can:system_categories.create');

    Route::patch('/systems/{system}/categories/{category}', [
        SystemCategoryController::class,
        'update',
    ])->middleware('can:system_categories.update');

    Route::delete('/systems/{system}/categories/{category}', [
        SystemCategoryController::class,
        'destroy',
    ])->middleware('can:system_categories.delete');

    /*
|--------------------------------------------------------------------------
| System Members and System Heads
|--------------------------------------------------------------------------
*/

    Route::get('/system-user-candidates', [
        SystemMemberController::class,
        'candidates',
    ])->middleware('can:systems.members.assign');

    Route::get('/systems/{system}/members', [
        SystemMemberController::class,
        'index',
    ])->middleware('can:systems.members.view');

    Route::put('/systems/{system}/members/{user}', [
        SystemMemberController::class,
        'upsert',
    ])->middleware('can:systems.members.assign');

    Route::delete('/systems/{system}/members/{user}', [
        SystemMemberController::class,
        'destroy',
    ])->middleware('can:systems.members.assign');


    /*
|--------------------------------------------------------------------------
| Requester Ticket Management
|--------------------------------------------------------------------------
|
| All authenticated users can create Personal
| tickets for their assigned active systems.
|
| Change Request authorization is enforced
| inside TicketController.
|
*/

    Route::get('/tickets/create-options', [
        TicketController::class,
        'createOptions',
    ]);

    Route::get('/tickets/system-categories', [
        TicketController::class,
        'systemCategories',
    ]);

    Route::post('/tickets', [
        TicketController::class,
        'store',
    ]);

    Route::get('/my-tickets', [
        TicketController::class,
        'myTickets',
    ]);

    Route::get('/tickets/{ticket}', [
        TicketController::class,
        'show',
    ]);

    Route::get('/ticket-attachments/{attachment}', [
        TicketAttachmentController::class,
        'download',
    ]);
});
