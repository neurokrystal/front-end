import type { IInstrumentRepository } from './instrument.repository';
import type { InstrumentOutput, InstrumentVersionWithItemsOutput } from './instrument.dto';
import { NotFoundError } from '@/shared/errors/domain-error';

export interface IInstrumentService {
  getActiveInstrument(slug: string): Promise<InstrumentOutput>;
  getLatestVersion(instrumentId: string): Promise<InstrumentVersionWithItemsOutput>;
  getInstrumentVersion(versionId: string): Promise<InstrumentVersionWithItemsOutput>;
}

export class InstrumentService implements IInstrumentService {
  constructor(private readonly instrumentRepository: IInstrumentRepository) {}

  async getActiveInstrument(slug: string): Promise<InstrumentOutput> {
    const instrument = await this.instrumentRepository.findActiveBySlug(slug);
    if (!instrument) {
      throw new NotFoundError('Instrument', slug);
    }
    return instrument;
  }

  async getLatestVersion(instrumentId: string): Promise<InstrumentVersionWithItemsOutput> {
    const version = await this.instrumentRepository.findLatestVersion(instrumentId);
    if (!version) {
      throw new NotFoundError('Instrument version', instrumentId);
    }
    return this.getInstrumentVersion(version.id);
  }

  async getInstrumentVersion(versionId: string): Promise<InstrumentVersionWithItemsOutput> {
    const version = await this.instrumentRepository.findVersionWithItems(versionId);
    if (!version) {
      throw new NotFoundError('Instrument version', versionId);
    }
    return version;
  }
}
