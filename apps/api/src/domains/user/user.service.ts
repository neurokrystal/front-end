import type { IUserRepository } from './user.repository';
import type { UserProfileOutput, UpdateProfileInput } from './user.dto';
import { NotFoundError } from '@/shared/errors/domain-error';

export interface IUserService {
  getProfile(userId: string, requestingUserId?: string): Promise<UserProfileOutput>;
  getUserById(userId: string): Promise<any | null>;
  updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfileOutput>;
  getUserDisplayName(userId: string): Promise<string>;
}

export class UserService implements IUserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getProfile(userId: string, requestingUserId?: string): Promise<UserProfileOutput> {
    let profile = await this.userRepository.findByUserId(userId);
    
    if (!profile) {
      // Auto-create profile if it doesn't exist
      profile = await this.userRepository.create({ userId });
    }
    
    return profile;
  }

  async getUserById(userId: string) {
    return this.userRepository.getUserById(userId);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfileOutput> {
    const profile = await this.userRepository.update(userId, input);
    if (!profile) {
      throw new NotFoundError('User profile', userId);
    }
    return profile;
  }

  async getUserDisplayName(userId: string): Promise<string> {
    const profile = await this.userRepository.findByUserId(userId);
    return profile?.displayName || 'Unknown User';
  }
}
