function unavailable(name: string): void {
  process.stdout.write(
    `[ANT-only] ${name} is unavailable in reconstructed mode.\n`,
  )
}

export async function logHandler(_logId?: string | number): Promise<void> {
  unavailable('log')
}

export async function errorHandler(_number?: number): Promise<void> {
  unavailable('error')
}

export async function exportHandler(
  _source: string,
  _outputFile: string,
): Promise<void> {
  unavailable('export')
}

export async function taskCreateHandler(
  _subject: string,
  _opts?: { description?: string; list?: string },
): Promise<void> {
  unavailable('task create')
}

export async function taskListHandler(_opts?: {
  list?: string
  pending?: boolean
  json?: boolean
}): Promise<void> {
  unavailable('task list')
}

export async function taskGetHandler(
  _id: string,
  _opts?: { list?: string },
): Promise<void> {
  unavailable('task get')
}

export async function taskUpdateHandler(
  _id: string,
  _opts?: {
    list?: string
    status?: string
    subject?: string
    description?: string
    owner?: string
    clearOwner?: boolean
  },
): Promise<void> {
  unavailable('task update')
}

export async function taskDirHandler(_opts?: {
  list?: string
}): Promise<void> {
  unavailable('task dir')
}

export async function completionHandler(
  _shell: string,
  _opts: { output?: string },
  _program: unknown,
): Promise<void> {
  unavailable('completion')
}
