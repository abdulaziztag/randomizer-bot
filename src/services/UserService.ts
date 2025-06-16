import { User, UserDocument } from '../db/models/user.model';
import { User as UserType } from '../types';

export class UserService {
  public async findOrCreateUser(userData: UserType): Promise<UserDocument> {
    try {
      let user = await User.findOne({ id: userData.id });
      
      if (!user) {
        user = await User.create(userData);
      }
      
      return user;
    } catch (error) {
      console.error('Error in findOrCreateUser:', error);
      throw error;
    }
  }

  public async updateUser(id: number, updateData: Partial<UserType>): Promise<UserDocument | null> {
    try {
      return await User.findOneAndUpdate(
        { id },
        { $set: updateData },
        { new: true }
      );
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }
} 