
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_types', function (Blueprint $table) {
            $table->id();

            // Stable identifier: ticket_type,
            // ticket_priority, ticket_status.
            $table->string('code', 64)->unique();

            $table->string('name', 100)->unique();

            $table->string('description', 500)
                ->nullable();

            $table->boolean('is_active')
                ->default(true);

            // Protected system-defined category type.
            $table->boolean('is_system')
                ->default(false);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('category_types');
    }
};
