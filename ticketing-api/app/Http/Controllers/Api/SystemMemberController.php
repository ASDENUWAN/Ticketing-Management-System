<?php

namespace App\Http\Controllers\Api;


use App\Http\Controllers\Controller;
use App\Models\System;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SystemMemberController extends Controller
{
    /**
     * GET /api/system-user-candidates?search=...
     *
     * Search users who can be assigned to systems.
     */
    public function candidates(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => [
                'required',
                'string',
                'min:2',
                'max:100',
            ],
        ]);

        $search = trim($data['search']);

        $users = User::query()
            ->with('roles')
            ->where(function ($query) use ($search) {
                $query
                    ->where('username', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            })
            ->orderBy('username')
            ->limit(20)
            ->get();

        return response()->json([
            'data' => $users->map(
                fn(User $user) => $this->formatUser($user)
            )->values(),
        ]);
    }

    /**
     * GET /api/systems/{system}/members
     */
    public function index(
        Request $request,
        System $system
    ): JsonResponse {
        $data = $request->validate([
            'search' => [
                'sometimes',
                'string',
                'max:100',
            ],
        ]);

        $search = trim($data['search'] ?? '');

        $query = $system->users()->with('roles');

        if ($search !== '') {
            $query->where(function ($query) use ($search) {
                $query
                    ->where('users.username', 'like', "%{$search}%")
                    ->orWhere('users.name', 'like', "%{$search}%");
            });
        }

        $page = $query
            ->orderBy('users.username')
            ->paginate(30);

        return response()->json([
            'data' => $page->getCollection()
                ->map(fn(User $user) => [
                    ...$this->formatUser($user),
                    'is_head' => (bool) $user->pivot->is_head,
                ])
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
     * PUT /api/systems/{system}/members/{user}
     *
     * Create or update a system assignment.
     */
    public function upsert(
        Request $request,
        System $system,
        User $user
    ): JsonResponse {
        $data = $request->validate([
            'is_head' => ['required', 'boolean'],
        ]);

        $makeHead = (bool) $data['is_head'];

        DB::transaction(function () use (
            $request,
            $system,
            $user,
            $makeHead
        ): void {
            $existing = $system->users()
                ->where('users.id', $user->id)
                ->first();

            $wasHead = (bool) (
                $existing?->pivot?->is_head ?? false
            );

            // Designating OR removing a head requires
            // the extra head-assignment permission.
            if ($makeHead || $wasHead) {
                abort_unless(
                    $request->user()->can(
                        'systems.heads.assign'
                    ),
                    403,
                    'You cannot modify System Head assignments.'
                );
            }

            // The role is assigned through the
            // existing Role Management workflow,
            // never automatically through this API.
            if ($makeHead) {
                abort_unless(
                    $user->hasRole('System Head', 'web'),
                    422,
                    'Assign the System Head role to this user first.'
                );
            }

            // Preserve other user assignments.
            $system->users()->syncWithoutDetaching([
                $user->id => [
                    'is_head' => $makeHead,
                ],
            ]);
        });

        return response()->json([
            'message' => 'System member saved successfully.',
            'data' => [
                'system_id' => $system->id,
                'user_id' => $user->id,
                'is_head' => $makeHead,
            ],
        ]);
    }

    /**
     * DELETE /api/systems/{system}/members/{user}
     */
    public function destroy(
        Request $request,
        System $system,
        User $user
    ): JsonResponse {
        DB::transaction(function () use (
            $request,
            $system,
            $user
        ): void {
            $existing = $system->users()
                ->where('users.id', $user->id)
                ->first();

            abort_unless(
                $existing,
                404,
                'This user is not assigned to the system.'
            );

            if ($existing->pivot->is_head) {
                abort_unless(
                    $request->user()->can(
                        'systems.heads.assign'
                    ),
                    403,
                    'You cannot remove a System Head.'
                );
            }

            $system->users()->detach($user->id);
        });

        return response()->json([
            'message' => 'System member removed successfully.',
        ]);
    }

    private function formatUser(User $user): array
    {
        $user->loadMissing('roles');

        return [
            'id' => $user->id,
            'username' => $user->username,
            'name' => $user->name,
            'roles' => $user->roles
                ->pluck('name')
                ->values()
                ->all(),
            'has_system_head_role' =>
            $user->hasRole('System Head', 'web'),
        ];
    }
}
