<?php

namespace App\Http\Controllers\Api;


use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    /**
     * GET /api/categories
     *
     * Required:
     * category_type_id
     *
     * Optional:
     * search, page
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category_type_id' => [
                'required',
                'integer',
                Rule::exists('category_types', 'id'),
            ],

            'search' => [
                'sometimes',
                'string',
                'max:100',
            ],
        ]);

        $search = trim($data['search'] ?? '');

        $query = Category::query()
            ->with('categoryType')
            ->where(
                'category_type_id',
                $data['category_type_id']
            );

        if ($search !== '') {
            $query->where(function ($query) use ($search) {
                $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere(
                        'description',
                        'like',
                        "%{$search}%"
                    );
            });
        }

        $page = $query
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(20);

        return response()->json([
            'data' => $page->getCollection()
                ->map(
                    fn(Category $category) =>
                    $this->formatCategory($category)
                )
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
     * POST /api/categories
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category_type_id' => [
                'required',
                'integer',
                Rule::exists('category_types', 'id')
                    ->where('is_active', true),
            ],

            'code' => [
                'required',
                'string',
                'max:64',
                'regex:/^[a-z][a-z0-9_]*$/',

                Rule::unique('categories', 'code')
                    ->where(
                        'category_type_id',
                        $request->input('category_type_id')
                    ),
            ],

            'name' => [
                'required',
                'string',
                'min:2',
                'max:100',

                Rule::unique('categories', 'name')
                    ->where(
                        'category_type_id',
                        $request->input('category_type_id')
                    ),
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

            'is_system' => ['prohibited'],
        ]);

        $category = Category::create([
            'category_type_id' => $data['category_type_id'],
            'code' => $data['code'],
            'name' => trim($data['name']),
            'description' => $data['description'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ]);

        $category->load('categoryType');

        return response()->json([
            'message' => 'Category created successfully.',
            'data' => $this->formatCategory($category),
        ], 201);
    }

    /**
     * PATCH /api/categories/{category}
     */
    public function update(
        Request $request,
        Category $category
    ): JsonResponse {
        $data = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'min:2',
                'max:100',

                Rule::unique('categories', 'name')
                    ->where(
                        'category_type_id',
                        $category->category_type_id
                    )
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
            'category_type_id' => ['prohibited'],
            'is_system' => ['prohibited'],
        ]);

        if (
            $category->is_system &&
            array_key_exists('is_active', $data) &&
            ! $data['is_active']
        ) {
            abort(
                409,
                'Core categories cannot be deactivated.'
            );
        }

        if (array_key_exists('name', $data)) {
            $data['name'] = trim($data['name']);
        }

        $category->update($data);
        $category->load('categoryType');

        return response()->json([
            'message' => 'Category updated successfully.',
            'data' => $this->formatCategory($category),
        ]);
    }

    /**
     * DELETE /api/categories/{category}
     */
    public function destroy(
        Category $category
    ): JsonResponse {
        abort_if(
            $category->is_system,
            409,
            'Core categories cannot be deleted.'
        );

        try {
            $category->delete();
        } catch (QueryException $error) {
            if ($this->isConstraintError($error)) {
                abort(
                    409,
                    'This category is currently used by another record.'
                );
            }

            throw $error;
        }

        return response()->json([
            'message' => 'Category deleted successfully.',
        ]);
    }

    private function formatCategory(
        Category $category
    ): array {
        $category->loadMissing('categoryType');

        return [
            'id' => $category->id,
            'category_type_id' =>
            $category->category_type_id,

            'code' => $category->code,
            'name' => $category->name,
            'description' => $category->description,
            'sort_order' => $category->sort_order,
            'is_active' => (bool) $category->is_active,
            'is_system' => (bool) $category->is_system,

            'category_type' => [
                'id' => $category->categoryType->id,
                'code' => $category->categoryType->code,
                'name' => $category->categoryType->name,
            ],
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
