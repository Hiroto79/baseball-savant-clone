# Baseball Savant Clone - Access Control

## Password Protection

This application is protected by password authentication to safeguard personal player data.

### Default Password
The default password is: `baseball2024`

### Changing the Password

1. Open the `.env` file in the project root
2. Change the value of `VITE_ACCESS_PASSWORD`:
   ```
   VITE_ACCESS_PASSWORD=your_new_password_here
   ```
3. Restart the development server

### Deployment

When deploying to a hosting platform (Vercel, Netlify, etc.):

1. Set the environment variable `VITE_ACCESS_PASSWORD` in your hosting platform's dashboard
2. Do NOT commit the `.env` file to git (it's already in `.gitignore`)
3. Share the password securely with authorized users

### Security Notes

⚠️ **Important**: This is client-side authentication only. The password can be discovered by inspecting the browser code. This provides basic access control but is not suitable for highly sensitive data.

For production use with sensitive data, consider:
- Using hosting platform's built-in password protection (Vercel, Netlify paid features)
- Implementing server-side authentication
- Using a proper authentication service (Auth0, Firebase Auth, etc.)

### Session Management

- Authentication state is stored in `sessionStorage`
- Users remain logged in until they close the browser tab
- Refreshing the page does not require re-login
- Closing the tab/browser clears the authentication

### Troubleshooting

**Locked out?**
- Clear your browser's sessionStorage
- Or use incognito/private browsing mode
- Check that `.env` file exists and contains the correct password

**Password not working after deployment?**
- Verify the environment variable is set in your hosting platform
- Environment variables must be prefixed with `VITE_` to be accessible in the frontend
- Redeploy after setting environment variables
