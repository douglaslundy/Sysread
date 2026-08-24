export interface Repository<Entity, Identifier = string> {
  deleteById(id: Identifier): Promise<boolean>;
  getById(id: Identifier): Promise<Entity | null>;
  save(entity: Entity): Promise<Entity>;
}