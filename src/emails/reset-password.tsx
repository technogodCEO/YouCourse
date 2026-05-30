interface ResetPasswordEmailProps {
  resetUrl: string
}

export default function PasswordResetEmail({ resetUrl }: ResetPasswordEmailProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset your YouCourse password</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#0D1B2A",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          color: "#F0F4F8",
        }}
      >
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: "#0D1B2A", padding: "40px 16px" }}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    maxWidth: "480px",
                    backgroundColor: "#132233",
                    borderRadius: "12px",
                    border: "1px solid #243B52",
                    padding: "40px 32px",
                  }}
                >
                  <tbody>
                    {/* Logo / Brand header */}
                    <tr>
                      <td style={{ paddingBottom: "32px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: "20px",
                            fontWeight: 600,
                            color: "#F0F4F8",
                          }}
                        >
                          YouCourse
                        </span>
                      </td>
                    </tr>

                    {/* Heading */}
                    <tr>
                      <td style={{ paddingBottom: "16px" }}>
                        <h1
                          style={{
                            margin: 0,
                            fontSize: "24px",
                            fontWeight: 600,
                            lineHeight: "1.2",
                            color: "#F0F4F8",
                          }}
                        >
                          Reset your YouCourse password
                        </h1>
                      </td>
                    </tr>

                    {/* Body text */}
                    <tr>
                      <td style={{ paddingBottom: "32px" }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "16px",
                            lineHeight: "1.5",
                            color: "#8BA3BA",
                          }}
                        >
                          We received a request to reset your password. This link expires in 1 hour.
                          If you did not request a password reset, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>

                    {/* CTA Button */}
                    <tr>
                      <td style={{ paddingBottom: "32px", textAlign: "center" }}>
                        <a
                          href={resetUrl}
                          style={{
                            display: "inline-block",
                            padding: "14px 32px",
                            borderRadius: "8px",
                            backgroundColor: "#F05A2A",
                            color: "#FFFFFF",
                            fontSize: "16px",
                            fontWeight: 600,
                            textDecoration: "none",
                            minHeight: "44px",
                            lineHeight: "1",
                          }}
                        >
                          Set New Password
                        </a>
                      </td>
                    </tr>

                    {/* Fallback URL */}
                    <tr>
                      <td style={{ paddingBottom: "16px" }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            lineHeight: "1.4",
                            color: "#4E6A82",
                          }}
                        >
                          Or copy and paste this URL into your browser:
                        </p>
                        <p
                          style={{
                            margin: "8px 0 0",
                            fontSize: "13px",
                            lineHeight: "1.4",
                            color: "#8BA3BA",
                            wordBreak: "break-all",
                          }}
                        >
                          {resetUrl}
                        </p>
                      </td>
                    </tr>

                    {/* Divider */}
                    <tr>
                      <td style={{ paddingTop: "16px" }}>
                        <hr style={{ border: "none", borderTop: "1px solid #243B52", margin: 0 }} />
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td style={{ paddingTop: "16px" }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            lineHeight: "1.4",
                            color: "#4E6A82",
                            textAlign: "center",
                          }}
                        >
                          &copy; {new Date().getFullYear()} YouCourse. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )
}
