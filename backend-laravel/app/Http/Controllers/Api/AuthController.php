<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Models\Agent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $validated = $request->validated();

        $agent = Agent::where('email', $validated['email'])->first();

        if (! $agent || ! Hash::check($validated['password'], $agent->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        return response()->json([
            'token' => $agent->createToken('dashboard-token')->plainTextToken,
            'agent' => $agent->only(['id', 'name', 'email', 'role']),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
