import { getData, generateUserId, type Pool, type User } from './dataStore.js';
import bcrypt from 'bcrypt';

export function registerUser(username:string, email:string, password:string, phoneNumber:string) {
    const data = getData();

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
    }

    // Password validation (at least 1 special character)
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharRegex.test(password)) {
        throw new Error("Password must contain at least one special character");
    }

    const existingUser = data.users.find(user => user.email === email.toLowerCase());
    if (existingUser) {
        throw new Error("Email already in use");
    }

    const hashedPassword = bcrypt.hashSync(password, 10); // Hash the password before storing

    const userId = generateUserId();
    const pools: Pool[] = [];
    const user: User = {
        userId,
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        phoneNumber,
        pools
    };

    data.users.push(user);
    return user;
}

export function getUserById(userId:string) {
    return getData().users.find(user => user.userId === userId);
}

export function loginUser(email:string, inputPassword:string) {
    const data = getData();
    const user = data.users.find(user => user.email === email.toLowerCase());

    if (!user) {
        throw new Error("Email not found");
    }

    if (!bcrypt.compareSync(inputPassword, user.password)) {
        throw new Error("Incorrect password");
    }

    return user;
}

export function editProfile(userId:string, newUsername?:string, newEmail?:string, newPassword?:string, newPhoneNumber?:string) {
    const data = getData();
    const user = data.users.find(user => user.userId === userId);

    if (!user) {
        throw new Error("User not found");
    }

    // Update user properties if new values are provided
    if (newUsername !== undefined) {
        user.username = newUsername;
    }
    if (newEmail !== undefined) {
        user.email = newEmail.toLowerCase();
    }
    if (newPassword !== undefined) {
        user.password = bcrypt.hashSync(newPassword, 10);
    }
    if (newPhoneNumber !== undefined) {
        user.phoneNumber = newPhoneNumber;
    }
}
