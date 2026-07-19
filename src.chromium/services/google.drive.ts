export interface GDOutputFile {
  id?: string
  name?: string
  originalFilename?: string
  properties?: Record<string, string>
  appProperties?: Record<string, string>
  createdTime?: string
  modifiedTime?: string
  parents?: string[]
  mimeType?: string
  copyRequiresWriterPermission?: true
  kind?: string
  size?: string
  fileExtension?: string
}

export interface ListFilesOpts {
  orderBy?: 'name' | 'name_natural' | 'createdTime' | 'modifiedTime' | 'recency'
  q?: string
  fields?: (keyof GDOutputFile)[]
}

export interface CreateFileOpts {
  name: string
  content: any
  appProperties?: Record<string, string>
  fields?: (keyof GDOutputFile)[]
}

export interface UpdFileOpts {
  fileId: string
  name?: string
  appProperties?: Record<string, string>
  content?: any
  fields?: (keyof GDOutputFile)[]
}

export async function listFiles(_opts: ListFilesOpts): Promise<GDOutputFile[]> {
  return []
}

export async function createJsonFile(_opts: CreateFileOpts): Promise<null> {
  return null
}

export async function getJsonFile<T>(_fileId: string): Promise<T | null> {
  return null
}

export async function updateJsonFile(_opts: UpdFileOpts): Promise<null> {
  return null
}

export async function deleteFile(_fileId: string): Promise<boolean> {
  return false
}
