import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Fichier téléversé et exposé publiquement' })
export class UploadedFile {
  @Field(() => String, { description: 'Identifiant interne généré pour le fichier' })
  id!: string;

  @Field(() => String, { description: 'Nom de fichier original envoyé par le client' })
  filename!: string;

  @Field(() => String, { description: 'Type MIME fourni lors du téléversement' })
  mimetype!: string;

  @Field(() => String, { description: 'Encodage fourni lors du téléversement' })
  encoding!: string;

  @Field(() => String, { description: 'Chemin relatif côté API pour servir le fichier' })
  path!: string;

  @Field(() => String, { description: 'URL publique complète pour accéder au fichier' })
  url!: string;
}
