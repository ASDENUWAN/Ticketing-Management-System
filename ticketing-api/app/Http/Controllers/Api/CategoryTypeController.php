<?php

namespace App\Http\Controllers\Api;


use App\Http\Controllers\Controller;
use App\Models\CategoryType;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryTypeController extends Controller
{
    /**
     * GET /api/category-types
     *
     * All types are returned because this list
     * also powers the category-type selector.
     */
    public function index(): JsonResponse
    {
        $types = CategoryType::query()
            ->withCount('categories')
            ->orderBy('name')
            ->get()
            ->map(
                fn(CategoryType $type) =>
                $this->formatType($type)
            );

        return response()->json([
            'data' => $types,
        ]);
    }

    /**
     * POST /api/category-types
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => [
                'required',
                'string',
                'max:64',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('category_types', 'code'),
            ],

            'name' => [
                'required',
                'string',
                'min:2',
                'max:100',
                Rule::unique('category_types', 'name'),
            ],

            'description' => [
                'nullable',
                'string',
                'max:500',
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],

            'is_system' => ['prohibited'],
        ]);

        $type = CategoryType::create([
            'code' => $data['code'],
            'name' => trim($data['name']),
            'description' => $data['description'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        $type->loadCount('categories');

        return response()->json([
            'message' => 'Category type created successfully.',
            'data' => $this->formatType($type),
        ], 201);
    }

    /**
     * PATCH /api/category-types/{categoryType}
     */
    public function update(
        Request $request,
        CategoryType $categoryType
    ): JsonResponse {
        $data = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'min:2',
                'max:100',
                Rule::unique('category_types', 'name')
                    ->ignore($categoryType->id),
            ],

            'description' => [
                'sometimes',
                'nullable',
                'string',
                'max:500',
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],

            // Machine codes and protected flags
            // cannot be changed after creation.
            'code' => ['prohibited'],
            'is_system' => ['prohibited'],
        ]);

        if (
            $categoryType->is_system &&
            array_key_exists('is_active', $data) &&
            ! $data['is_active']
        ) {
            abort(
                409,
                'Core category types cannot be deactivated.'
            );
        }

        if (array_key_exists('name', $data)) {
            $data['name'] = trim($data['name']);
        }

        $categoryType->update($data);
        $categoryType->loadCount('categories');

        return response()->json([
            'message' => 'Category type updated successfully.',
            'data' => $this->formatType($categoryType),
        ]);
    }

    /**
     * DELETE /api/category-types/{categoryType}
     */
    public function destroy(
        CategoryType $categoryType
    ): JsonResponse {
        abort_if(
            $categoryType->is_system,
            409,
            'Core category types cannot be deleted.'
        );

        abort_if(
            $categoryType->categories()->exists(),
            409,
            'Remove or reassign the categories in this type first.'
        );

        try {
            $categoryType->delete();
        } catch (QueryException $error) {
            if ($this->isConstraintError($error)) {
                abort(
                    409,
                    'This category type is currently in use.'
                );
            }

            throw $error;
        }

        return response()->json([
            'message' => 'Category type deleted successfully.',
        ]);
    }

    private function formatType(
        CategoryType $type
    ): array {
        return [
            'id' => $type->id,
            'code' => $type->code,
            'name' => $type->name,
            'description' => $type->description,
            'is_active' => (bool) $type->is_active,
            'is_system' => (bool) $type->is_system,
            'categories_count' =>
            (int) ($type->categories_count ?? 0),
        ];
    }

    private function isConstraintError(
        QueryException $error
    ): bool {
        return in_array(
            (string) ($error->errorInfo[0] ?? ''),
            ['23000', '23503', '19'],
            true
        );
    }
}
