<?php

namespace App\Http\Controllers\Api;


use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ProfileController extends Controller
{
    /**
     * PATCH /api/profile
     *
     * Only update the authenticated user's
     * own permitted profile fields.
     */
    public function update(
        UpdateUserRequest $request
    ): JsonResponse {
        $data = $request->safe()->only([
            'name',
            'email',
            'contact_no',
        ]);

        $userId = $request->user()->id;

        $user = DB::transaction(function () use (
            $userId,
            $data
        ): User {
            $user = User::query()
                ->whereKey($userId)
                ->lockForUpdate()
                ->firstOrFail();

            // Check against the current database state.
            // A Super Admin may have disabled editing
            // while this user was logged in.
            abort_unless(
                $user->canEditOwnProfile(),
                403,
                'You are not allowed to edit your profile.'
            );

            $user->update($data);

            return $user;
        });

        return response()->json([
            'message' => 'Profile updated successfully.',

            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'name' => $user->name,
                'email' => $user->email,
                'contact_no' => $user->contact_no,
                'profile_edit_enabled' =>
                (bool) $user->profile_edit_enabled,
                'can_edit_profile' =>
                $user->canEditOwnProfile(),
            ],
        ])->header('Cache-Control', 'private, no-store');
    }
}
