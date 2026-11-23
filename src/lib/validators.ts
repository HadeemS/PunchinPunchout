import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3, "Username must be 3–32 characters")
  .max(32, "Username must be 3–32 characters")
  .regex(
    /^[a-z0-9._-]+$/,
    "Username may only contain a-z, 0-9, ., _, -"
  )
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const createEmployeeSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  username: usernameSchema,
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  password: passwordSchema,
});

export const updateEmployeeSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1, "Full name is required").max(100),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
});

export const entryEditSchema = z
  .object({
    id: z.string().min(1),
    clockIn: z.string().min(1, "Clock in is required"),
    clockOut: z.string().optional().nullable(),
    note: z.string().min(1, "A reason note is required").max(500),
  })
  .superRefine((data, ctx) => {
    if (data.clockOut) {
      const inMs = new Date(data.clockIn).getTime();
      const outMs = new Date(data.clockOut).getTime();
      if (Number.isNaN(inMs) || Number.isNaN(outMs)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid date/time",
          path: ["clockIn"],
        });
        return;
      }
      if (outMs <= inMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Clock out must be after clock in",
          path: ["clockOut"],
        });
      }
    }
  });

export const entryCreateSchema = z
  .object({
    userId: z.string().min(1, "Employee is required"),
    clockIn: z.string().min(1, "Clock in is required"),
    clockOut: z.string().optional().nullable(),
    note: z.string().min(1, "A note is required").max(500),
  })
  .superRefine((data, ctx) => {
    if (data.clockOut) {
      const inMs = new Date(data.clockIn).getTime();
      const outMs = new Date(data.clockOut).getTime();
      if (Number.isNaN(inMs) || Number.isNaN(outMs)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid date/time",
          path: ["clockIn"],
        });
        return;
      }
      if (outMs <= inMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Clock out must be after clock in",
          path: ["clockOut"],
        });
      }
    }
  });

export const entryDeleteSchema = z.object({
  id: z.string().min(1),
  note: z.string().min(1, "A reason note is required").max(500),
});

export const settingsSchema = z.object({
  timezone: z.string().min(1, "Timezone is required"),
  kioskAutoLogout: z.enum(["true", "false"]),
  businessName: z.string().min(1, "Business name is required").max(100),
});
