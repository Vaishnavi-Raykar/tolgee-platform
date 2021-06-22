import React, {
  ReactNode,
  useEffect,
  createRef,
  useState,
  SyntheticEvent,
} from 'react';
import { BoxLoading } from '../../common/BoxLoading';
import { ScreenshotThumbnail } from './ScreenshotThumbnail';
import Box from '@material-ui/core/Box';

import { ProjectPermissionType } from '../../../service/response.types';
import { container } from 'tsyringe';
import AddIcon from '@material-ui/icons/Add';
import { T } from '@tolgee/react';
import { useConfig } from '../../../hooks/useConfig';
import { useProject } from '../../../hooks/useProject';
import { createStyles, makeStyles, Theme } from '@material-ui/core';
import { ScreenshotDetail } from './ScreenshotDetail';
import { ScreenshotDropzone } from './ScreenshotDropzone';
import { useProjectPermissions } from '../../../hooks/useProjectPermissions';
import { Skeleton } from '@material-ui/lab';
import { startLoading, stopLoading } from '../../../hooks/loading';

import { components } from '../../../service/apiSchema.generated';
import { useApiMutation, useApiQuery } from '../../../service/http/useQueryApi';
import { MessageService } from '../../../service/MessageService';

type KeyTranslationsDTO =
  components['schemas']['KeyWithTranslationsResponseDto'];

export interface ScreenshotGalleryProps {
  data: KeyTranslationsDTO;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    addIcon: {
      fontSize: 50,
    },
    addBox: {
      overflow: 'hidden',
      width: '100px',
      height: '100px',
      alignItems: 'center',
      justifyContent: 'center',
      display: 'flex',
      margin: '1px',
      cursor: 'pointer',
      borderColor: theme.palette.grey[200],
      color: theme.palette.grey[200],
      border: `1px dashed ${theme.palette.grey[200]}`,
      '&:hover': {
        borderColor: theme.palette.primary.main,
        color: theme.palette.primary.main,
      },
      flex: '0 0 auto',
    },
  })
);

const messageService = container.resolve(MessageService);
export const MAX_FILE_COUNT = 20;
const ALLOWED_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/gif'];

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = (props) => {
  const fileRef = createRef<HTMLInputElement>();
  const projectPermissions = useProjectPermissions();
  const classes = useStyles({});
  const config = useConfig();
  const project = useProject();

  const screenshotsLoadable = useApiQuery({
    url: '/api/project/{projectId}/screenshots/get',
    method: 'post',
    path: { projectId: project.id },
    content: { 'application/json': { key: props.data!.name! } },
  });

  const uploadLoadable = useApiMutation({
    url: '/api/project/{projectId}/screenshots',
    method: 'post',
  });
  //   (s) => s.loadables.uploadScreenshot
  // );

  const [detailFileName, setDetailFileName] = useState(null as string | null);

  const deleteLoadable = useApiMutation({
    url: '/api/project/screenshots/{ids}',
    method: 'delete',
  });

  const onDelete = (id: number) => {
    deleteLoadable.mutate(
      {
        path: { ids: [id] },
      },
      {
        onSuccess() {
          screenshotsLoadable.refetch();
        },
      }
    );
  };

  const addBox = projectPermissions.satisfiesPermission(
    ProjectPermissionType.TRANSLATE
  ) && (
    <Box
      key="add"
      className={`${classes.addBox}`}
      data-cy="add-box"
      //@ts-ignore
      onClick={() => fileRef.current.dispatchEvent(new MouseEvent('click'))}
    >
      <AddIcon className={classes.addIcon} />
    </Box>
  );

  const validate = (files: File[]) => {
    const result = {
      valid: false,
      errors: [] as ReactNode[],
    };

    if (files.length > MAX_FILE_COUNT) {
      result.errors.push(
        <T>translations.screenshots.validation.too_many_files</T>
      );
    }

    files.forEach((file) => {
      if (file.size > config.maxUploadFileSize * 1024) {
        result.errors.push(
          <T parameters={{ filename: file.name }}>
            translations.screenshots.validation.file_too_big
          </T>
        );
      }
      if (ALLOWED_UPLOAD_TYPES.indexOf(file.type) < 0) {
        result.errors.push(
          <T parameters={{ filename: file.name }}>
            translations.screenshots.validation.unsupported_format
          </T>
        );
      }
    });

    const valid = result.errors.length === 0;
    return { ...result, valid };
  };

  const validateAndUpload = async (files: File[]) => {
    const validation = validate(files);
    let errorHappened = false;
    if (validation.valid) {
      await Promise.all(
        files.map((file) =>
          uploadLoadable
            .mutateAsync({
              path: { projectId: project.id },
              query: { key: props!.data!.name! },
              content: {
                'multipart/form-data': {
                  screenshot: file as any,
                },
              },
            })
            .catch((e) => {
              errorHappened = true;
            })
        )
      );

      if (errorHappened) {
        messageService.error(
          <T>translations.screenshots.some_screenshots_not_uploaded</T>
        );
      }
      screenshotsLoadable.refetch();
    } else {
      validation.errors.forEach((e) => messageService.error(e));
    }
  };

  useEffect(() => {
    const listener = (e) => {
      e.preventDefault();
    };

    const pasteListener = (e: ClipboardEvent) => {
      const files: File[] = [];
      if (e.clipboardData == null) {
        return;
      }
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        const item = e.clipboardData.files.item(i);
        if (item) {
          files.push(item);
        }
      }
      validateAndUpload(files);
    };

    window.addEventListener('dragover', listener, false);
    window.addEventListener('drop', listener, false);
    document.addEventListener('paste', pasteListener);

    return () => {
      window.removeEventListener('dragover', listener, false);
      window.removeEventListener('drop', listener, false);
      document.removeEventListener('paste', pasteListener);
    };
  }, []);

  function onFileSelected(e: SyntheticEvent) {
    const files = (e.target as HTMLInputElement).files;
    if (!files) {
      return;
    }
    const toUpload: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const item = files.item(i);
      if (item) {
        toUpload.push(item);
      }
    }
    validateAndUpload(toUpload);
  }

  useEffect(() => {
    if (uploadLoadable.isLoading || deleteLoadable.isLoading) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [uploadLoadable.isLoading, deleteLoadable.isLoading]);

  const loadingSkeleton = uploadLoadable.isLoading ? (
    <Skeleton variant="rect" width={100} height={100} />
  ) : null;

  return (
    <>
      <input
        type="file"
        style={{ display: 'none' }}
        ref={fileRef}
        onChange={(e) => onFileSelected(e)}
        multiple
        accept={ALLOWED_UPLOAD_TYPES.join(',')}
      />
      <ScreenshotDropzone validateAndUpload={validateAndUpload}>
        {screenshotsLoadable.isLoading || !screenshotsLoadable.data ? (
          <BoxLoading />
        ) : screenshotsLoadable.data.length > 0 || uploadLoadable.isLoading ? (
          <Box display="flex" flexWrap="wrap" overflow="visible">
            {screenshotsLoadable.data.map((s) => (
              <ScreenshotThumbnail
                key={s.id}
                onClick={() => setDetailFileName(s.filename)}
                screenshotData={s}
                onDelete={onDelete}
              />
            ))}
            {loadingSkeleton}
            {addBox}
          </Box>
        ) : (
          <>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexGrow={1}
              p={2}
            >
              <Box>
                <T>no_screenshots_yet</T>
              </Box>
            </Box>
            {addBox}
          </>
        )}
      </ScreenshotDropzone>
      <ScreenshotDetail
        fileName={detailFileName as string}
        onClose={() => setDetailFileName(null)}
      />
    </>
  );
};
