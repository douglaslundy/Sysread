import type {
  CatalogRepository,
  ListPersonalInput,
  ListSummariesInput,
} from "./types";

export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  listPersonal(input: ListPersonalInput) {
    return this.repository.listPersonal(input);
  }

  listSummaries(input: ListSummariesInput) {
    return this.repository.listSummaries(input);
  }
}