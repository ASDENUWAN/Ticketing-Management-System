<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketRequest;
use App\Models\Category;
use App\Models\System;
use App\Models\SystemCategory;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class TicketController extends Controller
{
    /**
     * GET /api/tickets/create-options
     *
     * Return available ticket types and
     * eligible systems for the current user.
     */
    public function createOptions(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        $types = Category::query()
            ->whereHas('categoryType', function ($query) {
                $query
                    ->where('code', 'ticket_type')
                    ->where('is_active', true);
            })
            ->whereIn('code', [
                'personal',
                'change_request',
            ])
            ->where('is_active', true)
            ->get()
            ->keyBy('code');

        $assignedSystems = $user->systems()
            ->where('systems.is_active', true)
            ->orderBy('systems.name')
            ->get();

        $personalSystems = $assignedSystems
            ->map(fn($system) => $this->systemOption($system))
            ->values()
            ->all();

        $canRequestChange =
            $user->hasRole('System Head', 'web') &&
            $user->can('tickets.change_request.create');

        $changeSystems = $canRequestChange
            ? $assignedSystems
            ->filter(
                fn($system) =>
                (bool) $system->pivot->is_head
            )
            ->map(
                fn($system) =>
                $this->systemOption($system)
            )
            ->values()
            ->all()
            : [];

        $availableTypes = [];

        if ($types->has('personal')) {
            $availableTypes[] = [
                'id' => $types['personal']->id,
                'code' => 'personal',
                'name' => $types['personal']->name,
                'systems' => $personalSystems,
            ];
        }

        if (
            $types->has('change_request') &&
            count($changeSystems) > 0
        ) {
            $availableTypes[] = [
                'id' => $types['change_request']->id,
                'code' => 'change_request',
                'name' => $types['change_request']->name,
                'systems' => $changeSystems,
            ];
        }

        return response()->json([
            'data' => [
                'ticket_types' => $availableTypes,

                'attachment_rules' => [
                    'max_files' => 5,
                    'max_file_bytes_exclusive' => 2097152,
                    'extensions' => [
                        'jpg',
                        'jpeg',
                        'png',
                        'webp',
                        'pdf',
                        'doc',
                        'docx',
                        'xls',
                        'xlsx',
                    ],
                ],
            ],
        ])->header('Cache-Control', 'private, no-store');
    }

    /**
     * GET /api/tickets/system-categories
     *
     * Query:
     *   ticket_type_id
     *   system_id
     *
     * Returns only active categories for an
     * eligible system.
     */
    public function systemCategories(
        Request $request
    ): JsonResponse {
        $data = $request->validate([
            'ticket_type_id' => [
                'required',
                'integer',
            ],
            'system_id' => [
                'required',
                'integer',
            ],
        ]);

        $type = $this->validTicketType(
            (int) $data['ticket_type_id']
        );

        $system = System::query()
            ->find($data['system_id']);

        if (! $system || ! $system->is_active) {
            throw ValidationException::withMessages([
                'system_id' => [
                    'This system is currently unavailable.',
                ],
            ]);
        }

        $this->assertCanSubmit(
            $request->user(),
            $system,
            $type
        );

        $categories = $system->categories()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $categories
                ->map(fn(SystemCategory $category) => [
                    'id' => $category->id,
                    'code' => $category->code,
                    'name' => $category->name,
                    'description' => $category->description,
                ])
                ->values(),

            // Not a database record.
            'allow_other' => true,
        ])->header('Cache-Control', 'private, no-store');
    }

    /**
     * POST /api/tickets
     *
     * Create a Personal or Change Request ticket.
     */
    public function store(
        StoreTicketRequest $request
    ): JsonResponse {
        $data = $request->validated();

        $storedPaths = [];

        try {
            $ticket = DB::transaction(
                function () use (
                    $request,
                    $data,
                    &$storedPaths
                ): Ticket {
                    /*
                     * 1. Validate the ticket type.
                     */
                    $type = $this->validTicketType(
                        (int) $data['ticket_type_id']
                    );

                    /*
                     * 2. Verify the system is active.
                     */
                    $system = System::query()
                        ->find($data['system_id']);

                    if (
                        ! $system ||
                        ! $system->is_active
                    ) {
                        throw ValidationException::withMessages([
                            'system_id' => [
                                'The selected system is unavailable.',
                            ],
                        ]);
                    }

                    /*
                     * 3. Validate membership and
                     *    Change Request authorization.
                     *
                     * Lock the membership row while
                     * creating the ticket.
                     */
                    $this->assertCanSubmit(
                        $request->user(),
                        $system,
                        $type,
                        true
                    );

                    /*
                     * 4. Validate the selected module.
                     *
                     * NULL means "Other / I'm not sure".
                     */
                    $moduleId =
                        $data['system_category_id'] ?? null;

                    if ($moduleId !== null) {
                        $validModule = SystemCategory::query()
                            ->whereKey($moduleId)
                            ->where(
                                'system_id',
                                $system->id
                            )
                            ->where('is_active', true)
                            ->exists();

                        if (! $validModule) {
                            throw ValidationException::withMessages([
                                'system_category_id' => [
                                    'Please choose an available module or select Other.',
                                ],
                            ]);
                        }
                    }

                    /*
                     * 5. Get default priority and status.
                     *
                     * Never trust requester-supplied
                     * priority or status values.
                     */
                    $priority = $this->activeCategory(
                        'ticket_priority',
                        'medium'
                    );

                    $status = $this->activeCategory(
                        'ticket_status',
                        'open'
                    );

                    abort_unless(
                        $priority && $status,
                        503,
                        'Ticket submission is temporarily unavailable. Please contact CITS support.'
                    );

                    /*
                     * 6. Create the ticket.
                     */
                    $ticket = Ticket::create([
                        'requester_id' =>
                        $request->user()->id,

                        'ticket_type_id' =>
                        $type->id,

                        'priority_id' =>
                        $priority->id,

                        'status_id' =>
                        $status->id,

                        'system_id' =>
                        $system->id,

                        'system_category_id' =>
                        $moduleId,

                        'description' =>
                        trim($data['description']),
                    ]);

                    /*
                     * 7. Generate ticket number from
                     *    the database ID.
                     *
                     * Safe from MAX(id) race conditions.
                     */
                    $ticket->ticket_number =
                        'CITS-' .
                        str_pad(
                            (string) $ticket->id,
                            6,
                            '0',
                            STR_PAD_LEFT
                        );

                    $ticket->save();

                    /*
                     * 8. Store files privately.
                     */
                    foreach (
                        $request->file('attachments', [])
                        as $file
                    ) {
                        $path = Storage::disk('local')
                            ->putFile(
                                "ticket-attachments/{$ticket->id}",
                                $file
                            );

                        if (! is_string($path) || $path === '') {
                            throw new RuntimeException(
                                'Unable to store the attachment.'
                            );
                        }

                        // Remember this file so it can
                        // be deleted if the DB fails.
                        $storedPaths[] = $path;

                        $originalName = basename(
                            str_replace(
                                '\\',
                                '/',
                                $file->getClientOriginalName()
                            )
                        );

                        $originalName = preg_replace(
                            '/[\x00-\x1F\x7F]/',
                            '_',
                            $originalName
                        ) ?: 'attachment';

                        $originalName = mb_substr(
                            $originalName,
                            0,
                            200
                        );

                        $ticket->attachments()->create([
                            'original_name' =>
                            $originalName,

                            'file_path' =>
                            $path,

                            'disk' =>
                            'local',

                            'mime_type' =>
                            $file->getMimeType()
                                ?: 'application/octet-stream',

                            'file_size' =>
                            $file->getSize(),
                        ]);
                    }

                    return $ticket;
                }
            );
        } catch (Throwable $error) {
            // Database transactions do not
            // automatically undo filesystem writes.
            foreach ($storedPaths as $path) {
                Storage::disk('local')->delete($path);
            }

            throw $error;
        }

        $ticket->load([
            'ticketType',
            'priority',
            'status',
            'system',
            'systemCategory',
            'attachments',
        ]);

        $ticket->loadCount('attachments');

        return response()->json([
            'message' =>
            'Your ticket has been submitted successfully.',

            'data' => $this->formatTicket(
                $ticket,
                true
            ),
        ], 201)->header(
            'Cache-Control',
            'private, no-store'
        );
    }

    /**
     * GET /api/my-tickets
     */
    public function myTickets(
        Request $request
    ): JsonResponse {
        $data = $request->validate([
            'search' => [
                'sometimes',
                'string',
                'max:80',
            ],
            'page' => [
                'sometimes',
                'integer',
                'min:1',
            ],
        ]);

        $search = trim($data['search'] ?? '');

        $query = Ticket::query()
            ->where(
                'requester_id',
                $request->user()->id
            )
            ->with([
                'ticketType',
                'priority',
                'status',
                'system',
                'systemCategory',
            ])
            ->withCount('attachments');

        if ($search !== '') {
            $query->where(
                'ticket_number',
                'like',
                '%' .
                    addcslashes($search, '%_\\') .
                    '%'
            );
        }

        $page = $query
            ->orderByDesc('id')
            ->paginate(15);

        return response()->json([
            'data' => $page->getCollection()
                ->map(
                    fn(Ticket $ticket) =>
                    $this->formatTicket($ticket)
                )
                ->values(),

            'meta' => [
                'current_page' =>
                $page->currentPage(),

                'last_page' =>
                $page->lastPage(),

                'per_page' =>
                $page->perPage(),

                'total' =>
                $page->total(),
            ],
        ])->header('Cache-Control', 'private, no-store');
    }

    /**
     * GET /api/tickets/{ticket}
     *
     * Only the ticket requester may view
     * ticket details in Stage 1.
     */
    public function show(
        Request $request,
        Ticket $ticket
    ): JsonResponse {
        // Return 404 rather than revealing
        // another user's ticket exists.
        abort_unless(
            (int) $ticket->requester_id ===
                (int) $request->user()->id,
            404
        );

        $ticket->load([
            'ticketType',
            'priority',
            'status',
            'system',
            'systemCategory',
            'attachments',
        ]);

        $ticket->loadCount('attachments');

        return response()->json([
            'data' => $this->formatTicket(
                $ticket,
                true
            ),
        ])->header(
            'Cache-Control',
            'private, no-store'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Internal authorization helpers
    |--------------------------------------------------------------------------
    */

    private function validTicketType(
        int $ticketTypeId
    ): Category {
        $type = Category::query()
            ->whereKey($ticketTypeId)
            ->where('is_active', true)
            ->whereIn('code', [
                'personal',
                'change_request',
            ])
            ->whereHas(
                'categoryType',
                fn($query) => $query
                    ->where('code', 'ticket_type')
                    ->where('is_active', true)
            )
            ->first();

        if (! $type) {
            throw ValidationException::withMessages([
                'ticket_type_id' => [
                    'Please select a valid ticket type.',
                ],
            ]);
        }

        return $type;
    }

    private function activeCategory(
        string $typeCode,
        string $categoryCode
    ): ?Category {
        return Category::query()
            ->where('code', $categoryCode)
            ->where('is_active', true)
            ->whereHas(
                'categoryType',
                fn($query) => $query
                    ->where('code', $typeCode)
                    ->where('is_active', true)
            )
            ->first();
    }

    private function assertCanSubmit(
        User $user,
        System $system,
        Category $type,
        bool $lockAssignment = false
    ): void {
        $query = DB::table('system_user')
            ->where('system_id', $system->id)
            ->where('user_id', $user->id);

        if ($lockAssignment) {
            $query->lockForUpdate();
        }

        $assignment = $query->first();

        abort_unless(
            $assignment,
            403,
            'You are not assigned to the selected system.'
        );

        if ($type->code === 'change_request') {
            abort_unless(
                $user->hasRole('System Head', 'web') &&
                    $user->can('tickets.change_request.create') &&
                    (bool) $assignment->is_head,
                403,
                'You cannot submit a Change Request for this system.'
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Response helpers
    |--------------------------------------------------------------------------
    */

    private function systemOption(
        System $system
    ): array {
        return [
            'id' => $system->id,
            'code' => $system->code,
            'name' => $system->name,
            'description' => $system->description,
        ];
    }

    private function categoryValue(
        ?Category $category
    ): ?array {
        if (! $category) {
            return null;
        }

        return [
            'id' => $category->id,
            'code' => $category->code,
            'name' => $category->name,
        ];
    }

    private function formatTicket(
        Ticket $ticket,
        bool $includeAttachments = false
    ): array {
        $data = [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,

            'ticket_type' =>
            $this->categoryValue($ticket->ticketType),

            'priority' =>
            $this->categoryValue($ticket->priority),

            'status' =>
            $this->categoryValue($ticket->status),

            'system' => [
                'id' => $ticket->system->id,
                'code' => $ticket->system->code,
                'name' => $ticket->system->name,
            ],

            'system_category' =>
            $ticket->systemCategory
                ? [
                    'id' =>
                    $ticket->systemCategory->id,

                    'code' =>
                    $ticket->systemCategory->code,

                    'name' =>
                    $ticket->systemCategory->name,
                ]
                : null,

            'module_label' =>
            $ticket->systemCategory?->name
                ?? "Other / I'm not sure",

            'description' => $ticket->description,

            'attachments_count' =>
            (int) $ticket->attachments_count,

            'created_at' =>
            $ticket->created_at?->toIso8601String(),

            'updated_at' =>
            $ticket->updated_at?->toIso8601String(),
        ];

        if ($includeAttachments) {
            $data['attachments'] = $ticket->attachments
                ->map(fn($attachment) => [
                    'id' => $attachment->id,
                    'original_name' =>
                    $attachment->original_name,
                    'mime_type' =>
                    $attachment->mime_type,
                    'file_size' =>
                    $attachment->file_size,
                ])
                ->values()
                ->all();
        }

        return $data;
    }
}
