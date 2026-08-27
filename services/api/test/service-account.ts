/**
 * A throwaway service account key, for tests only.
 *
 * Generated with `openssl genpkey` and used nowhere: the project does not
 * exist, the token endpoint is oauth2.test, and every call that would reach
 * Google is intercepted. It is real RSA because the adapter really signs — a
 * placeholder string would make `crypto.subtle.importKey` throw and the auth
 * path would never be exercised at all.
 *
 * It is checked in on purpose. Rotating it protects nothing.
 */
export const TEST_TOKEN_URI = "https://oauth2.test/token";

export const TEST_SA_KEY = "{\"type\": \"service_account\", \"project_id\": \"loxa-test\", \"private_key_id\": \"testkeyid\", \"private_key\": \"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDRU/LMMiA8VU/b\\njQqEbGT+VmIFVT5K0nBEnq9GbUxdQFYZ0gZoOKJMLOQz+VzLW+R2NpoySgziN2uA\\nbZs9HBKGkgnQRPJqUBEUmvmraKzJdUPoVBO4rniMSBOJbeuFHAxIBeZW7tMOiUDy\\nQZtnJgmXslEZ6KRnsSdoXzOpUFPJwaicMUd3ZjcsbQiF+aLhTvjEDctojkPWT24h\\nzde1knoqc2CNu8uI9nhkIGWB+L3N8Nq0NsunVihO7KSGtyqf6QNCIhzpnLK33ns1\\nPhVCHmddnBlst2+HupVkMRMQlsKz64/NIF+0pO8CYyJr2SY4/6S9ahX+t/P4olj4\\nVJj+CRV/AgMBAAECggEAClEW4FWAHTkfLHTxFcG54IclYZnn7gwdGGSxwsjUQKxR\\nEgi15CEWbqavwJgDqMooomLiiqP3qpaMp9G/Gu3tQ9Cixy7+u5qinN9eesI38d3j\\nsOmj5zBCJLfQrq9KMk9Fk68mwRYYNNky6D2viQ/o3R8evCYpJCspBA3dH/UjjAf2\\nhplPgarKlzdH3+6tNfoy+lvAAGtzq86gvII2gwvesE2wVOd++gFd3my+vQIPMI4+\\nX+aPPPb+0JhpeRJaLrTEe30mA5CPBKf78eIzgtViAfqNiVLieW+0oyk4sTdF6Lfj\\nFROdVh0oQm/bGRZyWR5n0luBljxZxQzcMvWYumMzcQKBgQD3peGW0gBaHFBUbJSY\\nv1CXCp4s07NPJl3HNwIKQYVXDMaE5B2aWA1SuPzIyAFdzTNL2h0TOByd1mMJfg5k\\nIC1h9i/dPDK9Kdex4MkmWySVjGAgYVGqnhk1JGmVrMe04MZQvPVi5h1srIqv2Xip\\n7X1/Jnz/kc6RK8KyXAZBUSZhswKBgQDYYzksNZ85om5Ackb9ZlwlceN28IUIuAEk\\nr+mFtIlGStJgIhoo1E+3M2mVS7xkZH2aaXtGV5ZykVO0mHH9GjVu3nFB/6Mi87aH\\n38dojxaaOsKW7yYQBdTjHOrZnD4VRo9O1pJ24k3wYExbq8Z0Z1jb0fJSrmIDvUoS\\nuzuBDHmfBQKBgQCt0pD0+5Gjrhv0JgJm9GHsoldDv5QsChHosoOMD1E4OI9e136v\\nxv4TAiTsCPZskItgwkeGJexwHPqGvyP6w1sXV2VhM8+pVqU/BTgq4+5ZyZ3vHF/m\\nEfI/ir9Rf2TtYJfSM89JC5u7m5/8rfgzza44gRtbh0wmOUD/T/hUAFGgYQKBgQCx\\nxFIjz6mPX7HToA5R/tWUrYuBGvcvwnqt+RaPkVF1PeK2t01mXYVfrA0BacbLcwL8\\n58subqZaWKm7o8GBfRaIjpXc8nbDMBS0a1MWwvZ+nedet/k9EI1kR01omMMoF1+E\\nFSMeJ6x/3ZzdcrEG0CBf9optAnXjPI6t9MNdsTH5QQKBgAHjKU+52gzuf+0oJvK8\\n6g2ryAaBbiKyG6Cdy0QsWE+OcIgRarpylK9TaFR+bk0QAtUOBlwzLoVT06zcvEX2\\n3z8ODhHBpGKDb7I2sonp6PU78Ept7ywvNfp6OzBSKvVAgQiGtp2OkWttBzrIowlP\\nooUN5fnjarBQGEoMrYtVjEjI\\n-----END PRIVATE KEY-----\", \"client_email\": \"render-test@loxa-test.iam.gserviceaccount.com\", \"client_id\": \"0\", \"token_uri\": \"https://oauth2.test/token\"}";
