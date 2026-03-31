export type NotebookCellType = 'code' | 'markdown' | 'raw'

export type NotebookOutputImage = {
  image_data: string
  media_type: 'image/png' | 'image/jpeg'
}

export type NotebookCellSourceOutput = {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error'
  text?: string
  image?: NotebookOutputImage
}

export type NotebookCellSource = {
  cellType: NotebookCellType
  source: string
  execution_count?: number
  cell_id: string
  language?: string
  outputs?: NotebookCellSourceOutput[]
}

export type NotebookCellOutput =
  | {
      output_type: 'stream'
      text: string | string[]
    }
  | {
      output_type: 'execute_result' | 'display_data'
      data?: Record<string, unknown>
    }
  | {
      output_type: 'error'
      ename: string
      evalue: string
      traceback: string[]
    }

export type NotebookCell =
  | {
      cell_type: 'code'
      id?: string
      source: string | string[]
      metadata?: Record<string, unknown>
      execution_count: number | null
      outputs: NotebookCellOutput[]
    }
  | {
      cell_type: 'markdown' | 'raw'
      id?: string
      source: string | string[]
      metadata?: Record<string, unknown>
    }

export type NotebookContent = {
  nbformat: number
  nbformat_minor: number
  metadata: {
    language_info?: {
      name?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  cells: NotebookCell[]
}
