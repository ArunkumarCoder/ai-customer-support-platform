<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Uploaded files only ever live on the local disk, which is not
        // durable on a free-tier host (the container's filesystem is wiped
        // on every redeploy) — storing the raw text here too makes the
        // Documents "View" feature actually reliable, since these are
        // always small (max 5MB) plain .txt/.md files, never binary.
        Schema::table('documents', function (Blueprint $table) {
            $table->text('content')->nullable()->after('source_file');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('content');
        });
    }
};
