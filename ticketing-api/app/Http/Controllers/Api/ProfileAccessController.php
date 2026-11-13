<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProfileAccessRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProfileAccessController extends Controller
{
    /**
     * PATCH /api/users/{user}/profile-edit
     *
     * Enable or disable a normal user's
     * ability to edit their own profile.
     */
    public function update(
        UpdateProfileAccessRequest $request,
        User $user
    ): JsonResponse {
        $enabled = $request->boolean('enabled');

        // Super Admin accounts are not modified
        // through general user-access management.
        abort_if(
            $user->hasRole('Super Admin', 'web'),
            403,
            'Super Admin accounts are protected.'
        );

        $target = DB::transaction(function () use (
            $user,
            $enabled
        ): User {
            $target = User::query()
                ->whereKey($user->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Recheck protection inside the transaction.
            abort_if(
                $target->hasRole('Super Admin', 'web'),
                403,
                'Super Admin accounts are protected.'
            );

            $target->profile_edit_enabled = $enabled;
            $target->save();

            return $target;
        });

        // Record who changed this security setting.
        Log::notice('User profile editing access changed', [
            'actor_user_id' => $request->user()->id,
            'target_user_id' => $target->id,
            'profile_edit_enabled' => $enabled,
        ]);

        return response()->json([
            'message' => $enabled
                ? 'Profile editing enabled successfully.'
                : 'Profile editing disabled successfully.',

            'data' => [
                'id' => $target->id,
                'username' => $target->username,
                'profile_edit_enabled' =>
                (bool) $target->profile_edit_enabled,
                'can_edit_profile' =>
                $target->canEditOwnProfile(),
            ],
        ]);
    }
}
