
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();

            /*
            |--------------------------------------------------------------------------
            | Unique ticket number
            |--------------------------------------------------------------------------
            |
            | Generated on the server after the ID
            | is allocated.
            |
            | Example: CITS-000001
            |
            */

            $table->string('ticket_number', 32)
                ->nullable()
                ->unique();

            /*
            |--------------------------------------------------------------------------
            | Requester
            |--------------------------------------------------------------------------
            */

            $table->foreignId('requester_id')
                ->constrained('users')
                ->restrictOnDelete();

            /*
            |--------------------------------------------------------------------------
            | Ticket type, priority, and status
            |--------------------------------------------------------------------------
            |
            | All reference the existing
            | categories table.
            |
            */

            $table->foreignId('ticket_type_id')
                ->constrained('categories')
                ->restrictOnDelete();

            $table->foreignId('priority_id')
                ->constrained('categories')
                ->restrictOnDelete();

            $table->foreignId('status_id')
                ->constrained('categories')
                ->restrictOnDelete();

            /*
            |--------------------------------------------------------------------------
            | System and optional system module
            |--------------------------------------------------------------------------
            |
            | system_category_id = NULL means
            | "Other / I'm not sure".
            |
            */

            $table->foreignId('system_id')
                ->constrained('systems')
                ->restrictOnDelete();

            $table->foreignId('system_category_id')
                ->nullable()
                ->constrained('system_categories')
                ->restrictOnDelete();

            /*
            |--------------------------------------------------------------------------
            | Request description
            |--------------------------------------------------------------------------
            */

            $table->text('description');

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | Useful indexes
            |--------------------------------------------------------------------------
            */

            $table->index(
                ['requester_id', 'created_at'],
                'tickets_requester_created_index'
            );

            $table->index(
                ['system_id', 'status_id'],
                'tickets_system_status_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
