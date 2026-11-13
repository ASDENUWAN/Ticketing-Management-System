<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileAccessRequest extends FormRequest
{
    public function authorize(): bool
    {
        // This action is reserved for Super Admin.
        // Other admins cannot gain it merely by
        // assigning themselves a permission.
        return $this->user()?->hasRole(
            'Super Admin',
            'web'
        ) === true;
    }

    public function rules(): array
    {
        return [
            'enabled' => [
                'required',
                'boolean',
            ],
        ];
    }
}
