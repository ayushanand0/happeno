import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  firstName: { type: String, required: true, default: "Unknown" },
  lastName: {type: String, required: true, default: "User" },
  photo: { type: String, required: true },
})

const User = models.User || model('User', UserSchema);

export default User;