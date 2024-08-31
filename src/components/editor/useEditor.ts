import { TranscriptContent } from "@/shared/models";
import { QueryTranscriptByIdData } from "@/utils/rendererElectronAPI";
import { useReducer } from "react";

type TranscriptId = number;

export enum EditorMode {
  DICTATING,
  EDITING,
  SELECTION,
}
export type EditorState = {
  id: TranscriptId;
  title: string;
  contents: TranscriptContent[];
  mode: EditorMode;
};

export type EditorSetTitleAction = {
  type: "SET_TITLE";
  payload: string;
};
export type EditorAddContentAction = {
  type: "ADD_CONTENT";
  payload: TranscriptContent;
};
export type EditorRemoveContentAction = {
  type: "REMOVE_CONTENT";
  payload: TranscriptContent;
};
export type EditorUpdateContentAction = {
  type: "UPDATE_CONTENT";
  payload: Omit<TranscriptContent, "order">;
};
// Editor State Changes
export type EditorChangeEditorModeAction = {
  type: "CHANGE_EDITOR_MODE";
  payload: EditorMode;
};
export type EditorAction =
  | EditorSetTitleAction
  | EditorAddContentAction
  | EditorRemoveContentAction
  | EditorUpdateContentAction
  | EditorChangeEditorModeAction;

function editorReducer(state: EditorState, action: EditorAction) {
  switch (action.type) {
    case "SET_TITLE":
      return { ...state, title: action.payload };
    case "ADD_CONTENT":
      return { ...state, contents: [...state.contents, action.payload] };
    case "REMOVE_CONTENT":
      return {
        ...state,
        contents: state.contents.filter(
          (content) => content.id !== action.payload.id,
        ),
      };
    case "UPDATE_CONTENT":
      return {
        ...state,
        contents: state.contents.map((content) =>
          content.id === action.payload.id ? action.payload : content
        ),
      };
    case "CHANGE_EDITOR_MODE":
      return {
        ...state,
        mode: action.payload,
      };
  }
}

export function useEditor(data: QueryTranscriptByIdData) {
  const [state, dispatch] = useReducer(editorReducer, {
    // Transcript
    id: data.id,
    title: data.title,
    contents: data.contents,
    // Editor
    mode: EditorMode.EDITING,
  });

  const onTitleChange = (payload: string) => {
    dispatch({
      type: "SET_TITLE",
      payload,
    });
  };

  const onAddContent = (
    payload: TranscriptContent,
  ) => {
    dispatch({
      type: "ADD_CONTENT",
      payload,
    });
  };

  const onRemoveContent = (payload: TranscriptContent) => {
    dispatch({
      type: "REMOVE_CONTENT",
      payload,
    });
  };

  const onUpdateContent = (payload: TranscriptContent) => {
    dispatch({
      type: "UPDATE_CONTENT",
      payload,
    });
  };

  const onModeChange = (payload: EditorMode) => {
    dispatch({
      type: "CHANGE_EDITOR_MODE",
      payload,
    });
  };

  return {
    state,
    // Transcript Handlers
    onTitleChange,
    onAddContent,
    onUpdateContent,
    onRemoveContent,
    // Editor Handlers
    onModeChange,
  };
}
