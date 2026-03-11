// server/src/models/User.js
// Mongoose schema for a user account (ready for future auth integration).

import mongoose from "mongoose";
import bcrypt   from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, "Name is required"],
      trim:      true,
      maxlength: 80,
    },

    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },

    password: {
      type:     String,
      required: [true, "Password is required"],
      minlength: 8,
      select:   false,     // never returned in queries by default
    },

    plan: {
      type:    String,
      enum:    ["free", "pro", "enterprise"],
      default: "free",
    },

    preferredModel: {
      type:    String,
      default: "google/gemini-2.0-flash-exp:free",
    },

    // total tokens consumed (for billing / rate limiting)
    tokenUsage: {
      type:    Number,
      default: 0,
    },

    resetPasswordToken:   { type: String,  select: false },
    resetPasswordExpires: { type: Date,    select: false },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1 });

// ── Hash password before save ─────────────────────────────────────────────────
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt   = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance methods ──────────────────────────────────────────────────────────

/** Compare a plain-text password against the stored hash */
UserSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

/** Safe public representation (no password) */
UserSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

export default mongoose.model("User", UserSchema);