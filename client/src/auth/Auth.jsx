
import React, { useState } from 'react';

function Auth({ onAuthenticated }) {

    const [isLogin, setIsLogin] = useState(true);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();

        setError('');
        setLoading(true);

        try {
            const endpoint = isLogin
                ? '/api/auth/login'
                : '/api/auth/register';

            const response = await fetch(
                `http://localhost:5000${endpoint}`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify(
                        isLogin
                            ? { email, password }
                            : { name, email, password }
                    )
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || 'Something went wrong.'
                );
            }

            // Save login information
            localStorage.setItem('token', data.token);

            localStorage.setItem(
                'user',
                JSON.stringify(data.user)
            );

            // Inform App.jsx that login was successful
            onAuthenticated(data.user);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">

            <div className="auth-card">

                <div className="auth-logo">🫧</div>

                <h1>BUBBLE BLAST ADVENTURE</h1>

                <p>
                    {isLogin
                        ? 'Welcome back, bubble champion!'
                        : 'Create your player account!'}
                </p>

                <form onSubmit={handleSubmit}>

                    {!isLogin && (
                        <input
                            type="text"
                            placeholder="Your name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    )}

                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />

                    <input
                        type="password"
                        placeholder="Password (minimum 8 characters)"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        minLength={8}
                        required
                    />

                    {error && (
                        <p className="auth-error">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="primary full"
                        disabled={loading}
                    >
                        {loading
                            ? 'Please wait...'
                            : isLogin
                                ? 'Login'
                                : 'Create Account'}
                    </button>

                </form>

                <div className="auth-switch">

                    {isLogin
                        ? "Don't have an account?"
                        : 'Already have an account?'}

                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                    >
                        {isLogin ? 'Register' : 'Login'}
                    </button>

                </div>

            </div>

        </div>
    );
}

export default Auth;
