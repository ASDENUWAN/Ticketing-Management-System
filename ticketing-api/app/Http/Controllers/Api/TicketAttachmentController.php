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

        return $disk->download(
            $attachment->file_path,
            $attachment->original_name,
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
