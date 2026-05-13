import type { ICmsRepository } from './cms.repository';
import type { ContentBlockRow } from '../renderer/renderer.interface';

export interface ICmsService {
  getActiveBlocks(reportType: string, locale?: string): Promise<ContentBlockRow[]>;
}

export class CmsService implements ICmsService {
  constructor(private readonly cmsRepository: ICmsRepository) {}

  async getActiveBlocks(reportType: string, locale: string = 'en') {
    return this.cmsRepository.findActiveBlocks(reportType, locale);
  }
}
