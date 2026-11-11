<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    private function createTestUser(): User
    {
        return User::create([
            'username' => 'testuser',
            'password' => 'TestPassword123!',
        ]);
    }

    /**
     * Test successful login.
     */
    public function test_user_can_login(): void
    {
        $user = $this->createTestUser();

        $response = $this->postJson('/api/login', [
            'username' => 'testuser',
            'password' => 'TestPassword123!',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath(
                'message',
                'Login successful.'
            )
            ->assertJsonPath(
                'user.username',
                'testuser'
            );

        $this->assertAuthenticatedAs($user, 'web');
    }

    /**
     * Test incorrect password.
     */
    public function test_invalid_password_is_rejected(): void
    {
        $this->createTestUser();

        $this->postJson('/api/login', [
            'username' => 'testuser',
            'password' => 'WrongPassword123!',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['username']);

        $this->assertGuest('web');
    }

    /**
     * Unauthenticated users cannot access /api/me.
     */
    public function test_guest_cannot_access_profile(): void
    {
        $this->getJson('/api/me')
            ->assertUnauthorized();
    }

    /**
     * Authenticated users can access their profile.
     */
    public function test_user_can_access_profile(): void
    {
        $user = $this->createTestUser();

        $this->actingAs($user, 'web')
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath(
                'user.username',
                'testuser'
            );
    }

    /**
     * Test successful logout.
     */
    public function test_user_can_logout(): void
    {
        $user = $this->createTestUser();

        $this->actingAs($user, 'web');

        $this->postJson('/api/logout')
            ->assertOk()
            ->assertJsonPath(
                'message',
                'Logout successful.'
            );

        $this->assertGuest('web');
    }

    /**
     * Test login rate limiting.
     */
    public function test_login_is_rate_limited(): void
    {
        $this->createTestUser();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', [
                'username' => 'testuser',
                'password' => 'WrongPassword123!',
            ])->assertStatus(422);
        }

        $this->postJson('/api/login', [
            'username' => 'testuser',
            'password' => 'WrongPassword123!',
        ])->assertStatus(429);
    }
}
