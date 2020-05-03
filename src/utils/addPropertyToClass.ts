import { SetIntersection, ValuesType } from 'utility-types';
import GraphQLSet from './GraphQLSet';

export function addPropertyToClass<T, K extends keyof T>(
  classTarget: T,
  propertyKey: K,
  propertyValue: SetIntersection<ValuesType<T>, T[K]>,
  requestedFields: GraphQLSet<K>,
  fieldAccessor = propertyKey as string
) {
  if (requestedFields.size === 0) classTarget[propertyKey] = propertyValue;
  if (requestedFields.has(fieldAccessor as K)) classTarget[propertyKey] = propertyValue;

  return classTarget;
}
