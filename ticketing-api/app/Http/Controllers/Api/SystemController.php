<?php

namespace App\Http\Controllers\Api;


use App\Http\Controllers\Controller;
use App\Models\System;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SystemController extends Controller
{
    /**
     * GET /api/systems
     * Management list, including inactive systems.
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
        ]);

        $search = trim($data['search'] ?? '');

        $query = System::query()
            ->withCount(['categories', 'users']);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $page = $query->orderBy('name')->paginate(30);

        return response()->json([
            'data' => $page->getCollection()
                ->map(fn(System $system) => $this->format($system))
                ->values(),

            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    /**
     * GET /api/my-systems
     *
     * Only systems specifically assigned to
     * the authenticated user and currently active.
     */
    public function mySystems(Request $request): JsonResponse
    {
        $user = $request->user();

        $hasHeadRole = $user->hasRole(
            'System Head',
            'web'
        );

        $systems = $user->systems()
            ->where('systems.is_active', true)
            ->with([
                'categories' => function ($query) {
                    $query->where('is_active', true)
                        ->orderBy('sort_order')
                        ->orderBy('name');
                },
            ])
            ->orderBy('systems.name')
            ->get();

        return response()->json([
            'data' => $systems->map(
                fn(System $system) => [
                    'id' => $system->id,
                    'code' => $system->code,
                    'name' => $system->name,
                    'description' => $system->description,
                    'is_head' => (bool) $system->pivot->is_head,
                    'can_request_change' =>
                    (bool) $system->pivot->is_head &&
                        $hasHeadRole,

                    'categories' => $system->categories
                        ->map(fn($category) => [
                            'id' => $category->id,
                            'code' => $category->code,
                            'name' => $category->name,
                        ])
                        ->values(),
                ]
            )->values(),
        ]);
    }

    /**
     * GET /api/systems/{system}
     */
    public function show(System $system): JsonResponse
    {
        $system->loadCount(['categories', 'users']);

        return response()->json([
            'data' => $this->format($system),
        ]);
    }

    /**
     * POST /api/systems
     */
    public function store(Request $request): JsonResponse
    {
        $this->trimName($request);

        $data = $request->validate([
            'code' => [
                'required',
                'string',
                'max:64',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('systems', 'code'),
            ],
            'name' => [
                'required',
                'string',
                'min:2',
                'max:150',
                Rule::unique('systems', 'name'),
            ],
            'description' => [
                'nullable',
                'string',
                'max:2000',
            ],
            'is_active' => [
                'sometimes',
                'boolean',
            ],
        ]);

        $system = System::create($data);
        $system->loadCount(['categories', 'users']);

        return response()->json([
            'message' => 'System created successfully.',
            'data' => $this->format($system),
        ], 201);
    }

    /**
     * PATCH /api/systems/{system}
     */
    public function update(
        Request $request,
        System $system
    ): JsonResponse {
        $this->trimName($request);

        $data = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'min:2',
                'max:150',
                Rule::unique('systems', 'name')
                    ->ignore($system->id),
            ],
            'description' => [
                'sometimes',
                'nullable',
                'string',
                'max:2000',
            ],
            'is_active' => [
                'sometimes',
                'boolean',
            ],
            'code' => ['prohibited'],
        ]);

        $system->update($data);
        $system->loadCount(['categories', 'users']);

        return response()->json([
            'message' => 'System updated successfully.',
            'data' => $this->format($system),
        ]);
    }

    /**
     * DELETE /api/systems/{system}
     */
    public function destroy(System $system): JsonResponse
    {
        abort_if(
            $system->categories()->exists() ||
                $system->users()->exists(),
            409,
            'Remove system categories and user assignments first.'
        );

        try {
            $system->delete();
        } catch (QueryException $error) {
            if (in_array(
                (string) ($error->errorInfo[0] ?? ''),
                ['23000', '23503', '19'],
                true
            )) {
                abort(409, 'This system is currently in use.');
            }

            throw $error;
        }

        return response()->json([
            'message' => 'System deleted successfully.',
        ]);
    }

    private function trimName(Request $request): void
    {
        if (is_string($request->input('name'))) {
            $request->merge([
                'name' => trim($request->input('name')),
            ]);
        }
    }

    private function format(System $system): array
    {
        return [
            'id' => $system->id,
            'code' => $system->code,
            'name' => $system->name,
            'description' => $system->description,
            'is_active' => (bool) $system->is_active,
            'categories_count' =>
            (int) ($system->categories_count ?? 0),
            'users_count' =>
            (int) ($system->users_count ?? 0),
        ];
    }
}
