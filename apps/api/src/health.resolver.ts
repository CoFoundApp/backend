import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class HealthResolver {
  @Query(() => String, { description: 'Simple health ping' })
  health(): string {
    return 'ok';
  }
}
