<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /login
     *
     * Authenticate using username and password.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'username' => [
                'required',
                'string',
                'max:50',
            ],
            'password' => [
                'required',
                'string',
            ],
        ]);

        $username = $credentials['username'];
        $ip = (string) $request->ip();

        // Limit repeated failures for a username + IP.
        $accountKey = 'login:account:' . hash(
            'sha256',
            strtolower($username) . '|' . $ip
        );

        // Also limit failures across different usernames
        // from the same IP address.
        $ipKey = 'login:ip:' . hash('sha256', $ip);

        if (
            RateLimiter::tooManyAttempts($accountKey, 5) ||
            RateLimiter::tooManyAttempts($ipKey, 30)
        ) {
            $retryAfter = max(
                RateLimiter::availableIn($accountKey),
                RateLimiter::availableIn($ipKey)
            );

            return response()->json([
                'message' => 'Too many login attempts. Please try again later.',
            ], 429)->header(
                'Retry-After',
                (string) $retryAfter
            );
        }

        // Laravel checks the stored password hash.
        if (! Auth::guard('web')->attempt($credentials)) {
            RateLimiter::hit($accountKey, 60);
            RateLimiter::hit($ipKey, 60);

            throw ValidationException::withMessages([
                'username' => 'The provided credentials are incorrect.',
            ]);
        }

        // Clear successful account's failure counter.
        RateLimiter::clear($accountKey);

        // Prevent session fixation.
        $request->session()->regenerate();

        $user = Auth::guard('web')->user();

        return response()->json([
            'message' => 'Login successful.',
            'user' => $this->formatUser($user),
        ], 200);
    }

    /**
     * GET /api/auth/me
     *
     * Return the authenticated user's details.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->formatUser(
                $request->user()
            ),
        ], 200);
    }

    /**
     * POST /logout
     *
     * End the current authenticated session.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        // Destroy the old session and CSRF token.
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logout successful.',
        ], 200);
    }

    /**
     * Safe user representation for API responses.
     */
    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'username' => $user->username,
            'name' => $user->name,
            'email' => $user->email,
            'contact_no' => $user->contact_no,
            'roles' => $user->getRoleNames()->values()->all(),
        ];
    }
}
