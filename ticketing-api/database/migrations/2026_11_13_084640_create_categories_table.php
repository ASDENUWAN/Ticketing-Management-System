
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('category_type_id')
                ->constrained('category_types')
                ->restrictOnDelete();

            // Stable identifier within each type.
            $table->string('code', 64);

            $table->string('name', 100);

            $table->string('description', 500)
                ->nullable();

            $table->unsignedSmallInteger('sort_order')
                ->default(0);

            $table->boolean('is_active')
                ->default(true);

            $table->boolean('is_system')
                ->default(false);

            $table->timestamps();

            $table->unique(
                ['category_type_id', 'code'],
                'categories_type_code_unique'
            );

            $table->unique(
                ['category_type_id', 'name'],
                'categories_type_name_unique'
            );

            $table->index([
                'category_type_id',
                'is_active',
                'sort_order',
            ], 'categories_lookup_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
