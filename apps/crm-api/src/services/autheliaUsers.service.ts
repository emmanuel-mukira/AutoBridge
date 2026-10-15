import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
// import bcrypt from "bcryptjs";
import logger from "../lib/logger.js";

interface AutheliaUser {
  displayname: string;
  password: string;
  email: string;
  groups: string[];
}

interface AutheliaUsersDB {
  users: Record<string, AutheliaUser>;
}

/**
 * Service to manage Authelia users_database.yml
 * 
 * This service handles:
 * - Adding new users when they accept invites
 * - Updating passwords when users reset them
 * - Managing group assignments
 */
class AutheliaUsersService {
  private usersDbPath: string;
  private cache: AutheliaUsersDB | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.usersDbPath = path.join(
      process.cwd(),
      "..",
      "..",
      "infrastructure",
      "authelia",
      "users_database.yml"
    );
  }

  /**
   * Load users database with caching
   */
  private async loadUsersDB(): Promise<AutheliaUsersDB> {
    const now = Date.now();
    
    // Return cached version if still valid
    if (this.cache && now < this.cacheExpiry) {
      return this.cache;
    }

    try {
      const content = await fs.readFile(this.usersDbPath, "utf8");
      const parsed = yaml.load(content) as AutheliaUsersDB;
      
      this.cache = parsed;
      this.cacheExpiry = now + this.CACHE_TTL_MS;
      
      return parsed;
    } catch (error) {
      logger.error({ error, path: this.usersDbPath }, "Failed to load Authelia users DB");
      throw new Error("Could not load Authelia users database");
    }
  }

  /**
   * Save users database and clear cache
   */
  private async saveUsersDB(data: AutheliaUsersDB): Promise<void> {
    try {
      const yamlContent = yaml.dump(data, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      });

      await fs.writeFile(this.usersDbPath, yamlContent, "utf8");
      
      // Clear cache to force reload next time
      this.cache = null;
      this.cacheExpiry = 0;
      
      logger.info("Authelia users database updated");
    } catch (error) {
      logger.error({ error }, "Failed to save Authelia users DB");
      throw new Error("Could not save Authelia users database");
    }
  }

  /**
   * Generate argon2id hash using Authelia Docker container
   */
  private async generateArgon2Hash(password: string): Promise<string> {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const command = `docker run --rm authelia/authelia:4.38 authelia crypto hash generate argon2 --password '${password}'`;
      const { stdout } = await execAsync(command);

      // Extract hash from output (format: "Digest: $argon2id...")
      const match = stdout.match(/Digest:\s*(\$argon2id\$\S+)/);
      if (!match) {
        throw new Error("Could not parse Authelia hash output");
      }

      return match[1];
    } catch (error) {
      logger.error({ error }, "Failed to generate Argon2 hash");
      throw new Error("Could not generate password hash");
    }
  }

  /**
   * Add or update a user in Authelia database
   */
  async addOrUpdateUser(params: {
    username: string;
    email: string;
    displayName: string;
    password: string;
    groups: string[];
  }): Promise<void> {
    const { username, email, displayName, password, groups } = params;

    // Validate inputs
    if (!username || !email || !password || !groups.length) {
      throw new Error("Missing required user fields");
    }

    // Generate argon2id hash
    const passwordHash = await this.generateArgon2Hash(password);

    // Load current database
    const usersDB = await this.loadUsersDB();

    // Update or add user
    usersDB.users[username] = {
      displayname: displayName,
      password: passwordHash,
      email,
      groups,
    };

    // Save updated database
    await this.saveUsersDB(usersDB);

    logger.info({ username, email, groups }, "User added/updated in Authelia");
  }

  /**
   * Remove a user from Authelia database
   */
  async removeUser(username: string): Promise<void> {
    const usersDB = await this.loadUsersDB();

    if (!usersDB.users[username]) {
      throw new Error(`User ${username} not found in Authelia`);
    }

    delete usersDB.users[username];
    await this.saveUsersDB(usersDB);

    logger.info({ username }, "User removed from Authelia");
  }

  /**
   * Check if a user exists in Authelia
   */
  async userExists(username: string): Promise<boolean> {
    const usersDB = await this.loadUsersDB();
    return username in usersDB.users;
  }

  /**
   * Get user info from Authelia
   */
  async getUser(username: string): Promise<AutheliaUser | null> {
    const usersDB = await this.loadUsersDB();
    return usersDB.users[username] || null;
  }

  /**
   * Generate username from email and name
   * Format: firstname.lastname or base.username if conflict
   */
  generateUsername(email: string, firstName: string, lastName: string): string {
    const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z.]/g, "");
    return base;
  }

  /**
   * Map CRM role to Authelia groups
   */
  mapRoleToGroups(role: string): string[] {
    switch (role.toLowerCase()) {
      case "admin":
        return ["admin"];
      case "sales_rep":
        return ["sales_rep"];
      default:
        return ["sales_rep"]; // Default to least privilege
    }
  }
}

export const autheliaUsersService = new AutheliaUsersService();
