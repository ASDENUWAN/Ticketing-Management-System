<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\System;
use App\Models\SystemCategory;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SystemCategoryController extends Controller
{
    /**
     * GET /api/systems/{system}/categories
     *
     * Managers see all categories.
     * Assigned users see only active categories
     * of an active system.
     */
    public function index(
        Request $request,
        System $system
    ): JsonResponse {
        $manager = $request->user()
            ->can('systems.view');

        if (! $manager) {
            $assigned = $system->is_active &&
                $system->users()
                ->where('users.id', $request->user()->id)
                ->exists();

            abort_unless($assigned, 403);
        }

        $query = $system->categories();

        if (! $manager) {
            $query->where('is_active', true);
        }

        return response()->json([
            'data' => $query
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn($category) => $this->format($category)),
        ]);
    }

    /**
     * POST /api/systems/{system}/categories
     */
    public function store(
        Request $request,
        System $system
    ): JsonResponse {
        $this->trimName($request);

        $data = $request->validate([
            'code' => [
                'required',
                'string',
                'max:64',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('system_categories', 'code')
                    ->where('system_id', $system->id),
            ],
            'name' => [
                'required',
                'string',
                'min:2',
                'max:120',
                Rule::unique('system_categories', 'name')
                    ->where('system_id', $system->id),
            ],
            'description' => [
                'nullable',
                'string',
                'max:500',
            ],
            'sort_order' => [
                'sometimes',
                'integer',
                'between:0,65535',
            ],
            'is_active' => [
                'sometimes',
                'boolean',
            ],
        ]);

        $category = $system->categories()->create($data);

        return response()->json([
            'message' => 'System category created.',
            'data' => $this->format($category),
        ], 201);
    }

    /**
     * PATCH /api/systems/{system}/categories/{category}
     */
    public function update(
        Request $request,
        System $system,
        SystemCategory $category
    ): JsonResponse {
        $this->belongsToSystem($system, $category);
        $this->trimName($request);

        $data = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'min:2',
                'max:120',
                Rule::unique('system_categories', 'name')
                    ->where('system_id', $system->id)
                    ->ignore($category->id),
            ],
            'description' => [
                'sometimes',
                'nullable',
                'string',
                'max:500',
            ],
            'sort_order' => [
                'sometimes',
                'integer',
                'between:0,65535',
            ],
            'is_active' => [
                'sometimes',
                'boolean',
            ],
            'code' => ['prohibited'],
            'system_id' => ['prohibited'],
        ]);

        $category->update($data);

        return response()->json([
            'message' => 'System category updated.',
            'data' => $this->format($category),
        ]);
    }

    /**
     * DELETE /api/systems/{system}/categories/{category}
     */
    public function destroy(
        System $system,
        SystemCategory $category
    ): JsonResponse {
        $this->belongsToSystem($system, $category);

        try {
            $category->delete();
        } catch (QueryException $error) {
            if (in_array(
                (string) ($error->errorInfo[0] ?? ''),
                ['23000', '23503', '19'],
                true
            )) {
                abort(
                    409,
                    'This module is already referenced by a ticket.'
                );
            }

            throw $error;
        }

        return response()->json([
            'message' => 'System category deleted.',
        ]);
    }

    private function belongsToSystem(
        System $system,
        SystemCategory $category
    ): void {
        abort_unless(
            $category->system_id === $system->id,
            404
        );
    }

    private function trimName(Request $request): void
    {
        if (is_string($request->input('name'))) {
            $request->merge([
                'name' => trim($request->input('name')),
            ]);
        }
    }

    private function format(SystemCategory $category): array
    {
        return [
            'id' => $category->id,
            'system_id' => $category->system_id,
            'code' => $category->code,
            'name' => $category->name,
            'description' => $category->description,
            'sort_order' => $category->sort_order,
            'is_active' => (bool) $category->is_active,
        ];
    }
}
