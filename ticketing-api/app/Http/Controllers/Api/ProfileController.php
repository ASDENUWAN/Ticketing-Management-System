<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateUserRequest;
use Illuminate\Http\JsonResponse;

class ProfileController extends Controller
{
    /**
     * PATCH /api/profile
     *
     * Users can edit their own profile.
     */
    public function update(
        UpdateUserRequest $request
    ): JsonResponse {
        $user = $request->user();

        $user->update(
            $request->safe()->only([
                'name',
                'email',
                'contact_no',
            ])
        );

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'name' => $user->name,
                'email' => $user->email,
                'contact_no' => $user->contact_no,
            ],
        ]);
    }
}
