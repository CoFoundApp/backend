import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload-ts';
import { UploadService } from './upload.service';
import { UploadedFile } from './dto/uploaded-file.type';

@Resolver()
export class UploadResolver {
  constructor(private readonly uploads: UploadService) {}

  @Mutation(() => UploadedFile, { description: 'Upload a file' })
  async uploadFile(
    @Args({ name: 'file', type: () => GraphQLUpload }) file: FileUpload,
  ): Promise<UploadedFile> {
    return this.uploads.save(file);
  }
}
