<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TicketAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TicketAttachmentController extends Controller
{
    /**
     * GET /api/ticket-attachments/{attachment}
     *
     * Stage 1: only the ticket requester can
     * download the attachment.
     */
    public function download(
        Request $request,
        TicketAttachment $attachment
    ): StreamedResponse {
        $attachment->load('ticket');

        $ticket = $attachment->ticket;

        abort_unless(
            $ticket &&
                (int) $ticket->requester_id ===
                (int) $request->user()->id,
            404
        );

        // Stage 1 only stores private local files.
        abort_unless(
            $attachment->disk === 'local',
            404
        );

        $disk = Storage::disk('local');

        abort_unless(
            $disk->exists($attachment->file_path),
            404,
            'Attachment not found.'
        );

        $stream = $disk->readStream($attachment->file_path);

        abort_unless(is_resource($stream), 404, 'Attachment not found.');

        return response()->streamDownload(
            function () use ($stream): void {
                fpassthru($stream);
                fclose($stream);
            },
            $attachment->file_path,
            [
                'Content-Type' =>
                'application/octet-stream',

                'X-Content-Type-Options' =>
                'nosniff',

                'Cache-Control' =>
                'private, no-store',
            ]
        );
    }
}
