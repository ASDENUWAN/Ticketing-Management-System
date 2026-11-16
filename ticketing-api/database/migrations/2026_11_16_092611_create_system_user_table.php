
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_user', function (Blueprint $table) {
            $table->foreignId('system_id')
                ->constrained('systems')
                ->restrictOnDelete();

            $table->foreignId('user_id')
                ->constrained('users')
                ->restrictOnDelete();

            // Identifies the head of THIS system.
            $table->boolean('is_head')
                ->default(false);

            $table->timestamps();

            $table->primary([
                'system_id',
                'user_id',
            ]);

            $table->index([
                'user_id',
                'is_head',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_user');
    }
};
