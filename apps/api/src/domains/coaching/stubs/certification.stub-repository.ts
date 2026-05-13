export interface ICertificationRepository {
  hasActiveCertification(coachUserId: string): Promise<boolean>;
}

export class CertificationStubRepository implements ICertificationRepository {
  async hasActiveCertification(coachUserId: string): Promise<boolean> {
    return false;  // No certifications exist yet
  }
}
