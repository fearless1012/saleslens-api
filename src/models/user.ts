import mongoose from "mongoose";

interface IUser {
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserModel extends mongoose.Model<IUser> {
  findByEmail(email: string): Promise<IUser>;
}

const userSchema = new mongoose.Schema<IUser, UserModel>(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Method to find a user by email
userSchema.statics.findByEmail = async function (
  email: string
): Promise<IUser | null> {
  return this.findOne({ email });
};

export const User = mongoose.model<IUser, UserModel>("User", userSchema);
