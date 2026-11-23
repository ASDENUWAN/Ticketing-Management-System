
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_attachments', function (Blueprint $table) {
            $table->id();

            /*
            |--------------------------------------------------------------------------
            | Parent ticket
            |--------------------------------------------------------------------------
            */

            $table->foreignId('ticket_id')
                ->constrained('tickets')
                ->restrictOnDelete();

            /*
            |--------------------------------------------------------------------------
            | File metadata
            |--------------------------------------------------------------------------
            */

            $table->string('original_name', 255);

            // Relative path, never a public URL.
            $table->string('file_path', 500);

            // Default private local disk.
            $table->string('disk', 30)
                ->default('local');

            $table->string('mime_type', 150);

            // Actual file size in bytes.
            $table->unsignedInteger('file_size');

            $table->timestamps();

            $table->index('ticket_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_attachments');
    }
};
