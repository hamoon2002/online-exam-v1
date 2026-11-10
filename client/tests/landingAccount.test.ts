import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement, Fragment } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../src/context/AuthContext';
import type { User } from '../src/api/authApi';
import { getLandingAccountView } from '../src/pages/LandingPage/components/landingAccountView';
import Navbar from '../src/pages/LandingPage/components/Navbar';
import Hero from '../src/pages/LandingPage/components/Hero';

const instructor: User = {
  id: 'instructor-1', role: 'Instructor', name: 'مریم رضایی',
  username: 'maryam', onboardingCompleted: true, avatarUrl: '/images/profile.jpg',
};

function renderLanding(user: User | null, isSessionReady = true) {
  const auth: AuthContextValue = {
    user, isSessionReady, isAuthenticated: !!user,
    isSessionUnavailable: false, retrySession: () => {}, logout: () => {},
  };
  return renderToString(
    createElement(MemoryRouter, {},
      createElement(AuthContext.Provider, { value: auth },
        createElement(Fragment, {},
          createElement(Navbar),
          createElement(Hero),
        ),
      ),
    ),
  );
}

test('authenticated user sees glass profile and panel action instead of guest login/signup', () => {
  const html = renderLanding(instructor);
  assert.match(html, /مریم رضایی/);
  assert.match(html, /profile\.jpg/);
  assert.match(html, /منوی حساب کاربری/);
  assert.match(html, /ورود به میزکار/);
  assert.doesNotMatch(html, /ثبت‌نام رایگان|شروع رایگان/);
  assert.doesNotMatch(html, />ورود<\/button>/);
});

test('guest sees login, signup and free-start CTAs', () => {
  const html = renderLanding(null);
  assert.match(html, /ثبت‌نام رایگان/);
  assert.match(html, /شروع رایگان/);
  assert.match(html, />ورود<\/button>/);
  assert.doesNotMatch(html, /منوی حساب کاربری/);
});

test('unverified session shows neither a stale profile nor guest login buttons', () => {
  const html = renderLanding(instructor, false);
  assert.doesNotMatch(html, /مریم رضایی|ثبت‌نام رایگان|شروع رایگان|ورود به میزکار/);
  assert.doesNotMatch(html, /منوی حساب کاربری/);
});

test('destination and display name match the signed-in role with safe fallbacks', () => {
  assert.deepEqual(getLandingAccountView({ user: instructor, isSessionReady: true }), {
    status: 'authenticated',
    user: instructor,
    displayName: 'مریم رضایی',
    roleName: 'مدرس',
    dashboardPath: '/workspace',
  });
  const student = { ...instructor, role: 'Student' as const, name: '  ', username: 'student7' };
  assert.equal(getLandingAccountView({ user: student, isSessionReady: true }).dashboardPath, '/dashboard');
  const admin = { ...instructor, role: 'SuperAdmin' as const, name: undefined, username: undefined };
  assert.equal(getLandingAccountView({ user: admin, isSessionReady: true }).displayName, 'کاربر');
  assert.equal(getLandingAccountView({ user: admin, isSessionReady: true }).dashboardPath, '/workspace');
  assert.equal(getLandingAccountView({ user: instructor, isSessionReady: false }).status, 'pending');
  assert.equal(getLandingAccountView({ user: null, isSessionReady: true }).status, 'guest');
});
