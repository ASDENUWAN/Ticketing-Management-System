<?php

namespace App\Http\Controllers\Api;


use App\Http\Controllers\Controller;
use App\Models\TicketAttachment;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TicketAttachmentController extends Controller
{
    public function download(
        Request $request,
        TicketAttachment $attachment
    ): StreamedResponse {

        // Load ticket details.
        $attachment->loadMissing('ticket');

        $ticket = $attachment->ticket;

        // Only the ticket requester can download.
        abort_unless(
            $ticket &&
                (int) $ticket->requester_id ===
                (int) $request->user()->id,
            404,
            'Attachment not found.'
        );

        // Only private local storage.
        abort_unless(
            $attachment->disk === 'local',
            404
        );

        /**
         * Tell Intelephense the actual
         * Laravel filesystem adapter type.
         *
         * @var FilesystemAdapter $disk
         */
        $disk = Storage::disk('local');

        $filePath = $attachment->file_path;

        // Check that the file exists.
        abort_unless(
            $disk->exists($filePath),
            404,
            'Attachment not found.'
        );

        // Use the original filename, not the path.
        $downloadName = basename(
            str_replace(
                '\\',
                '/',
                (string) $attachment->original_name
            )
        );

        $downloadName = preg_replace(
            '/[\x00-\x1F\x7F]/',
            '_',
            $downloadName
        ) ?: 'attachment';

        // Secure private download.
        return $disk->download(
            $filePath,
            $downloadName,
            [
                'Content-Type' => 'application/octet-stream',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, no-store',
            ]
        );
    }
}
