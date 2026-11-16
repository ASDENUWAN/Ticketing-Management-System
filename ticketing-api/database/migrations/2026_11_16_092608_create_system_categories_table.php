
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_categories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('system_id')
                ->constrained('systems')
                ->restrictOnDelete();

            $table->string('code', 64);
            $table->string('name', 120);

            $table->string('description', 500)
                ->nullable();

            $table->unsignedSmallInteger('sort_order')
                ->default(0);

            $table->boolean('is_active')
                ->default(true);

            $table->timestamps();

            $table->unique(
                ['system_id', 'code'],
                'system_categories_code_unique'
            );

            $table->unique(
                ['system_id', 'name'],
                'system_categories_name_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_categories');
    }
};
